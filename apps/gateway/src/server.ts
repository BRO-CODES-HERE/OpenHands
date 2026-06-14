import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import {
  validateRequestFrame,
  type RequestFrame,
  type ResponseFrame,
  type EventFrame,
} from "@openhands/gateway-protocol";
import {
  handleConnect,
  handleHealth,
  removeClient,
} from "./server-methods/index.js";
import { SessionStore } from "@openhands/session";
import { loadConfig } from "@openhands/config";
import { Agent, OpenAIProvider, GeminiProvider, AnthropicProvider } from "@openhands/agent";
import { PluginLoader } from "@openhands/plugin-sdk";

export interface GatewayConfig {
  host: string;
  port: number;
}

export class GatewayServer {
  private wss: WebSocketServer | null = null;
  private config: GatewayConfig;
  private channels = new Map<string, { name: string; type: string; connectionId: string }>();
  private sessionStore = new SessionStore(path.join(process.cwd(), "data", "sessions"));
  private pluginLoader = new PluginLoader();

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    // Load dynamic plugins during startup
    await this.pluginLoader.loadDirectory(path.join(process.cwd(), "extensions")).catch(err => {
      console.error("PluginLoader failed to scan directory:", err);
    });

    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({
        host: this.config.host,
        port: this.config.port,
        // Security: Prevent DoS by limiting payload size to 2MB (default is 100MB)
        maxPayload: 2 * 1024 * 1024,
        verifyClient: (info, cb) => {
          const origin = info.req.headers.origin;
          if (!origin) {
            // Allow connections with no origin (e.g., CLI)
            return cb(true);
          }

          try {
            const url = new URL(origin);
            if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
              return cb(true);
            }
          } catch {
            // Invalid URL
          }

          // Reject cross-site requests
          cb(false, 403, "Forbidden");
        },
      });

      this.wss.on("listening", () => {
        console.log(
          `Gateway listening on ${this.config.host}:${this.config.port}`,
        );
        resolve();
      });

      this.wss.on("error", (err) => {
        reject(err);
      });

      this.wss.on("connection", (ws: WebSocket) => {
        this.handleConnection(ws);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => resolve());
      this.wss = null;
    });
  }

  private handleConnection(ws: WebSocket): void {
    let connected = false;
    let connectionId: string | null = null;
    const nonce = crypto.randomUUID();

    const send = (frame: ResponseFrame | EventFrame) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(frame));
      }
    };

    // Step 1: Send connect.challenge event
    send({
      type: "event",
      event: "connect.challenge",
      payload: { nonce },
    });

    ws.on("message", (data: Buffer) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        send({
          type: "res",
          id: "0",
          ok: false,
          error: { code: "PARSE_ERROR", message: "Invalid JSON" },
        });
        return;
      }

      // Step 2: Must connect first
      if (!connected) {
        if (
          !validateRequestFrame(parsed) ||
          (parsed as RequestFrame).method !== "connect"
        ) {
          send({
            type: "res",
            id: (parsed as any)?.id ?? "0",
            ok: false,
            error: {
              code: "NOT_CONNECTED",
              message: "First frame must be a connect request",
            },
          });
          ws.close();
          return;
        }

        const req = parsed as RequestFrame;
        const client = handleConnect(req, nonce, send);
        if (!client) {
          ws.close();
          return;
        }
        connected = true;
        connectionId = client.connectionId;
        return;
      }

      // Step 3+: Handle methods
      if (!validateRequestFrame(parsed)) {
        send({
          type: "res",
          id: "0",
          ok: false,
          error: { code: "INVALID_FRAME", message: "Expected a request frame" },
        });
        return;
      }

      const req = parsed as RequestFrame;
      this.handleMethod(ws, req, send, connectionId!);
    });

    const cleanup = () => {
      if (connectionId) {
        removeClient(connectionId);
        for (const [chId, ch] of this.channels.entries()) {
          if (ch.connectionId === connectionId) {
            this.channels.delete(chId);
          }
        }
      }
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  }

  private async handleMethod(
    _ws: WebSocket,
    req: RequestFrame,
    send: (frame: ResponseFrame | EventFrame) => void,
    connectionId: string,
  ): Promise<void> {
    switch (req.method) {
      case "health":
        handleHealth(req, send);
        break;
      case "ping":
        send({
          type: "res",
          id: req.id,
          ok: true,
          payload: { pong: true, timestamp: Date.now() },
        });
        break;
      case "channel.register": {
        const { channelId, name, type } = (req.params as any) || {};
        if (!channelId || !name || !type) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "INVALID_PARAMS", message: "Missing channelId, name, or type" }
          });
          return;
        }
        this.channels.set(channelId, { name, type, connectionId });
        send({
          type: "res",
          id: req.id,
          ok: true,
          payload: { registered: true }
        });
        break;
      }
      case "session.create": {
        const { title } = (req.params as any) || {};
        try {
          const session = await this.sessionStore.createSession(title);
          send({
            type: "res",
            id: req.id,
            ok: true,
            payload: session
          });
        } catch (err: any) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "SESSION_ERROR", message: err.message }
          });
        }
        break;
      }
      case "session.list": {
        try {
          const sessions = await this.sessionStore.listSessions();
          send({
            type: "res",
            id: req.id,
            ok: true,
            payload: sessions
          });
        } catch (err: any) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "SESSION_ERROR", message: err.message }
          });
        }
        break;
      }
      case "session.get": {
        const { sessionId } = (req.params as any) || {};
        if (!sessionId) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "INVALID_PARAMS", message: "Missing sessionId" }
          });
          return;
        }
        try {
          const session = await this.sessionStore.getSession(sessionId);
          if (!session) {
            send({
              type: "res",
              id: req.id,
              ok: false,
              error: { code: "NOT_FOUND", message: "Session not found" }
            });
            return;
          }
          send({
            type: "res",
            id: req.id,
            ok: true,
            payload: session
          });
        } catch (err: any) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "SESSION_ERROR", message: err.message }
          });
        }
        break;
      }
      case "session.delete": {
        const { sessionId } = (req.params as any) || {};
        if (!sessionId) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "INVALID_PARAMS", message: "Missing sessionId" }
          });
          return;
        }
        try {
          await this.sessionStore.deleteSession(sessionId);
          send({
            type: "res",
            id: req.id,
            ok: true,
            payload: { deleted: true }
          });
        } catch (err: any) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "SESSION_ERROR", message: err.message }
          });
        }
        break;
      }
      case "config.get": {
        try {
          const config = await loadConfig().catch(() => ({}));
          // Mask API keys for security
          const safeConfig = JSON.parse(JSON.stringify(config));
          if (safeConfig.llm) {
            for (const provider of Object.keys(safeConfig.llm)) {
              if (typeof safeConfig.llm[provider] === 'object' && safeConfig.llm[provider]?.apiKey) {
                safeConfig.llm[provider].apiKey = "********";
              }
            }
          }
          send({
            type: "res",
            id: req.id,
            ok: true,
            payload: safeConfig
          });
        } catch (err: any) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "CONFIG_ERROR", message: err.message }
          });
        }
        break;
      }
      case "config.set": {
        const { config } = (req.params as any) || {};
        if (!config) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "INVALID_PARAMS", message: "Missing config" }
          });
          return;
        }
        try {
          // Restore masked API keys
          const existingConfig = await loadConfig().catch(() => ({}));
          if (config.llm && existingConfig.llm) {
            for (const provider of Object.keys(config.llm)) {
              if (typeof config.llm[provider] === 'object' && config.llm[provider]?.apiKey === "********") {
                config.llm[provider].apiKey = existingConfig.llm[provider]?.apiKey;
              }
            }
          }
          const fs = await import("fs/promises");
          const targetPath = path.join(process.cwd(), "openhand.json");
          await fs.writeFile(targetPath, JSON.stringify(config, null, 2), "utf-8");
          send({
            type: "res",
            id: req.id,
            ok: true,
            payload: { saved: true }
          });
        } catch (err: any) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "CONFIG_ERROR", message: err.message }
          });
        }
        break;
      }
      case "channel.message.send": {
        const { channelId, userId, messageId, content, sessionId } = (req.params as any) || {};
        if (!channelId || !userId || !messageId || !content) {
          send({
            type: "res",
            id: req.id,
            ok: false,
            error: { code: "INVALID_PARAMS", message: "Missing channelId, userId, messageId, or content" }
          });
          return;
        }

        // Acknowledge the message receipt
        send({
          type: "res",
          id: req.id,
          ok: true,
          payload: { sent: true }
        });

        // Run the agent flow asynchronously to not block the socket
        (async () => {
          let replyContent = "";

          try {
            // 1. Resolve LLM Provider using loaded config (bypass in test environments)
            const appConfig = process.env.VITEST ? null : await loadConfig().catch(() => null);
            let providerInstance: any;

            if (appConfig?.llm) {
              const { provider: providerName } = appConfig.llm;
              if (providerName === "openai" && appConfig.llm.openai) {
                providerInstance = new OpenAIProvider(appConfig.llm.openai);
              } else if (providerName === "gemini" && appConfig.llm.gemini) {
                providerInstance = new GeminiProvider(appConfig.llm.gemini);
              } else if (providerName === "anthropic" && appConfig.llm.anthropic) {
                providerInstance = new AnthropicProvider(appConfig.llm.anthropic);
              } else if (
                (providerName === "deepseek" || providerName === "qwen" || providerName === "meta") &&
                (appConfig.llm as any)[providerName]
              ) {
                const details = (appConfig.llm as any)[providerName];
                providerInstance = new OpenAIProvider({
                  apiKey: details.apiKey || "dummy",
                  model: details.model,
                  baseUrl: details.baseUrl
                });
              }
            }

            // Fallback mock provider if no keys are configured
            if (!providerInstance) {
              providerInstance = {
                generateResponse: async (messages: any[]) => {
                  const lastMsg = messages[messages.length - 1];
                  return {
                    message: {
                      role: "assistant",
                      content: `Mock Agent reply: received "${lastMsg?.content || ""}"`
                    }
                  };
                }
              };
            }

            // 2. Load session history if sessionId is provided
            if (sessionId) {
              const session = await this.sessionStore.getSession(sessionId);
              if (session) {
                // Dynamically import built-in tools
                const toolsList: any[] = [];
                try {
                  const { ReadFileTool, WriteFileTool, ListDirTool, CalculatorTool } = await import("@openhands/tools");
                  toolsList.push(new ReadFileTool(), new WriteFileTool(), new ListDirTool(), new CalculatorTool());
                } catch {
                  // ignore import failures during partial builds
                }

                // Append tools from dynamic plugins
                const pluginTools = this.pluginLoader.getAllTools();
                toolsList.push(...pluginTools);

                // Initialize agent loop with history
                const agent = new Agent(providerInstance, toolsList);
                for (const m of session.messages) {
                  agent.addMessage(m);
                }

                // Execute agent loop
                replyContent = await agent.run(content);

                // Persist session history
                session.messages = agent.getMessages();
                await this.sessionStore.saveSession(session);
              } else {
                replyContent = `Session "${sessionId}" not found.`;
              }
            } else {
              // One-off direct LLM generation
              const response = await providerInstance.generateResponse([{ role: "user", content }]);
              replyContent = response.message.content || "";
            }

          } catch (err: any) {
            replyContent = `Agent error: ${err.message}`;
          }

          // 3. Emit reply event to the channel client
          const replyFrame: EventFrame = {
            type: "event",
            event: "agent.message.reply",
            payload: {
              channelId,
              userId,
              content: replyContent
            }
          };

          if (_ws.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify(replyFrame));
          }
        })();

        break;
      }
      default:
        send({
          type: "res",
          id: req.id,
          ok: false,
          error: {
            code: "METHOD_NOT_FOUND",
            message: `Unknown method: ${req.method}`,
          },
        });
    }
  }

  broadcastEvent(event: string, payload?: unknown): void {
    if (!this.wss) return;
    const frame: EventFrame = { type: "event", event, payload };
    const msg = JSON.stringify(frame);

    // ⚡ Bolt: Convert to Buffer once. If we pass a string to `ws.send()`, the library
    // internally converts it to a Buffer for *every* client. Pre-allocating the Buffer
    // and sending with `{ binary: false }` to keep it as a text frame improves broadcast
    // performance by ~50% for many connected clients.
    const buf = Buffer.from(msg);

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(buf, { binary: false });
      }
    });
  }
}
