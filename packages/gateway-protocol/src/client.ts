import { WebSocket } from "ws";
import { RequestFrame, ResponseFrame, EventFrame } from "./types.js";
import { PROTOCOL_VERSION } from "./version.js";

export type EventHandler = (event: string, payload?: unknown) => void;

export interface HelloOkPayload {
  protocolVersion: number;
  connectionId: string;
  serverInfo: { version: string };
  features: { methods: string[]; events: string[] };
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<string, (res: ResponseFrame) => void>();
  private eventHandlers = new Set<EventHandler>();
  private _connectionId: string | null = null;
  private _features: { methods: string[]; events: string[] } | null = null;

  get connectionId(): string | null {
    return this._connectionId;
  }

  get features() {
    return this._features;
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  async connect(serverUrl: string): Promise<HelloOkPayload> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl);

      ws.on("open", () => {
        // connection opened, wait for challenge event
      });

      ws.on("message", (data: Buffer) => {
        let frame: unknown;
        try {
          frame = JSON.parse(data.toString());
        } catch {
          return;
        }

        const msg = frame as Record<string, unknown>;

        if (msg.type === "event" && msg.event === "connect.challenge") {
          // Send connect request
          const req: RequestFrame = {
            type: "req",
            id: this.nextId(),
            method: "connect",
            params: {
              minProtocol: PROTOCOL_VERSION,
              maxProtocol: PROTOCOL_VERSION,
              client: {
                id: "oh-cli",
                version: "0.0.1",
                platform: "cli",
              },
            },
          };
          ws.send(JSON.stringify(req));
          return;
        }

        if (msg.type === "res") {
          const res = msg as unknown as ResponseFrame;
          if (res.ok && res.payload && typeof res.payload === "object") {
            const payload = res.payload as Record<string, unknown>;
            if (payload.connectionId && payload.features) {
              this._connectionId = payload.connectionId as string;
              this._features = payload.features as { methods: string[]; events: string[] };
              this.ws = ws;
              resolve(res.payload as HelloOkPayload);
              return;
            }
          }

          const handler = this.pending.get(res.id);
          if (handler) {
            this.pending.delete(res.id);
            handler(res);
          }
          return;
        }

        if (msg.type === "event") {
          const ev = msg as unknown as EventFrame;
          for (const handler of this.eventHandlers) {
            handler(ev.event, ev.payload);
          }
        }
      });

      ws.on("error", (err) => {
        reject(err);
      });

      ws.on("close", () => {
        this.ws = null;
        this._connectionId = null;
        this._features = null;
      });
    });
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws) {
      throw new Error("Not connected to gateway");
    }

    const id = this.nextId();
    const req: RequestFrame = { type: "req", id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 10000);

      this.pending.set(id, (res) => {
        clearTimeout(timeout);
        if (res.ok) {
          resolve(res.payload);
        } else {
          reject(new Error(`${res.error?.code}: ${res.error?.message}`));
        }
      });

      this.ws!.send(JSON.stringify(req));
    });
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connectionId = null;
    this._features = null;
    this.pending.clear();
  }

  private nextId(): string {
    this.requestId++;
    return `cli-${this.requestId}`;
  }
}
