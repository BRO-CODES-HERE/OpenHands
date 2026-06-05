export type EventHandler = (event: string, payload?: any) => void;

export interface HelloOkPayload {
  protocolVersion: number;
  connectionId: string;
  serverInfo: { version: string };
  features: { methods: string[]; events: string[] };
}

export class GatewayClientBrowser {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<string, (res: any) => void>();
  private eventHandlers = new Set<EventHandler>();
  private _connectionId: string | null = null;
  private _features: any = null;

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

      ws.onopen = () => {
        // opened
      };

      ws.onmessage = (event) => {
        let frame: any;
        try {
          frame = JSON.parse(event.data);
        } catch {
          return;
        }

        if (frame.type === "event" && frame.event === "connect.challenge") {
          this.requestId++;
          const req = {
            type: "req",
            id: `web-${this.requestId}`,
            method: "connect",
            params: {
              minProtocol: 1,
              maxProtocol: 1,
              client: {
                id: "oh-webchat",
                version: "0.0.1",
                platform: "browser"
              }
            }
          };
          ws.send(JSON.stringify(req));
          return;
        }

        if (frame.type === "res") {
          if (frame.ok && frame.payload && frame.payload.connectionId) {
            this._connectionId = frame.payload.connectionId;
            this._features = frame.payload.features;
            this.ws = ws;
            resolve(frame.payload);
            return;
          }

          const handler = this.pending.get(frame.id);
          if (handler) {
            this.pending.delete(frame.id);
            handler(frame);
          }
          return;
        }

        if (frame.type === "event") {
          for (const handler of this.eventHandlers) {
            handler(frame.event, frame.payload);
          }
        }
      };

      ws.onerror = (err) => {
        reject(err);
      };

      ws.onclose = () => {
        this.ws = null;
        this._connectionId = null;
        this._features = null;
      };
    });
  }

  async request(method: string, params?: any): Promise<any> {
    if (!this.ws) {
      throw new Error("Not connected to gateway");
    }

    this.requestId++;
    const id = `web-${this.requestId}`;
    const req = { type: "req", id, method, params };

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
}
