import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { GatewayServer } from "../src/server.js";

const HOST = "127.0.0.1";
const PORT = 18999;
const WS_URL = `ws://${HOST}:${PORT}`;

let server: GatewayServer;

class TestClient {
  ws: WebSocket;
  private buffer: any[] = [];
  private listeners: ((msg: any) => void)[] = [];

  static async connect(timeout = 3000): Promise<TestClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      const client = new TestClient(ws);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("Connection timeout"));
      }, timeout);
      ws.on("open", () => {
        clearTimeout(timer);
        resolve(client);
      });
      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        const listener = this.listeners.shift();
        if (listener) {
          listener(msg);
        } else {
          this.buffer.push(msg);
        }
      } catch {
        // ignore parse errors in buffer
      }
    });
  }

  send(frame: any): void {
    this.ws.send(JSON.stringify(frame));
  }

  async recv(timeout = 2000): Promise<any> {
    if (this.buffer.length > 0) {
      return this.buffer.shift()!;
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Receive timeout"));
      }, timeout);
      this.listeners.push((msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });
  }

  close(): void {
    this.ws.close();
  }
}

beforeAll(async () => {
  server = new GatewayServer({ host: HOST, port: PORT });
  await server.start();
}, 5000);

afterAll(async () => {
  await server.stop();
}, 10000);

async function handshake(client: TestClient): Promise<string> {
  const challenge = await client.recv();
  expect(challenge.event).toBe("connect.challenge");
  client.send({
    type: "req",
    id: "init",
    method: "connect",
    params: {
      minProtocol: 1,
      maxProtocol: 1,
      client: { id: "test", version: "1.0.0", platform: "test" },
    },
  });
  const res = await client.recv();
  expect(res.ok).toBe(true);
  return res.payload.connectionId;
}

describe("Gateway Protocol", () => {
  it("should reject connection with invalid JSON", async () => {
    const client = await TestClient.connect();
    await client.recv(); // drain connect.challenge
    client.ws.send("not-json");
    const res = await client.recv();
    expect(res.type).toBe("res");
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("PARSE_ERROR");
    client.close();
  });

  it("should reject non-connect first frame", async () => {
    const client = await TestClient.connect();
    const challenge = await client.recv();
    expect(challenge.type).toBe("event");
    expect(challenge.event).toBe("connect.challenge");
    expect(challenge.payload.nonce).toBeTruthy();

    client.send({ type: "req", id: "1", method: "health" });
    const res = await client.recv();
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("NOT_CONNECTED");
    client.close();
  });

  it("should complete full connect handshake", async () => {
    const client = await TestClient.connect();
    const connId = await handshake(client);
    expect(connId).toBeTruthy();
    client.close();
  });

  it("should reject protocol version mismatch", async () => {
    const client = await TestClient.connect();
    await client.recv(); // challenge

    client.send({
      type: "req",
      id: "2",
      method: "connect",
      params: {
        minProtocol: 99,
        maxProtocol: 99,
        client: { id: "bad-version", version: "1.0.0", platform: "test" },
      },
    });

    const res = await client.recv();
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("PROTOCOL_MISMATCH");
    client.close();
  });

  it("should reject invalid connect params", async () => {
    const client = await TestClient.connect();
    await client.recv(); // challenge

    client.send({
      type: "req",
      id: "3",
      method: "connect",
      params: {
        minProtocol: "bad",
        maxProtocol: 1,
        client: "not-an-object",
      },
    });

    const res = await client.recv();
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("INVALID_PARAMS");
    client.close();
  });
});

describe("Gateway Methods", () => {
  let client: TestClient;

  beforeAll(async () => {
    client = await TestClient.connect();
    await handshake(client);
  });

  afterAll(() => {
    client.close();
  });

  it("should respond to health method", async () => {
    client.send({ type: "req", id: "h1", method: "health" });
    const res = await client.recv();
    expect(res.type).toBe("res");
    expect(res.id).toBe("h1");
    expect(res.ok).toBe(true);
    expect(res.payload.status).toBe("ok");
    expect(typeof res.payload.uptime).toBe("number");
    expect(typeof res.payload.timestamp).toBe("number");
  });

  it("should respond to ping method", async () => {
    client.send({ type: "req", id: "p1", method: "ping" });
    const res = await client.recv();
    expect(res.type).toBe("res");
    expect(res.id).toBe("p1");
    expect(res.ok).toBe(true);
    expect(res.payload.pong).toBe(true);
    expect(typeof res.payload.timestamp).toBe("number");
  });

  it("should return METHOD_NOT_FOUND for unknown methods", async () => {
    client.send({ type: "req", id: "u1", method: "nonexistent" });
    const res = await client.recv();
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("METHOD_NOT_FOUND");
  });
});

describe("Gateway Events", () => {
  it("should receive broadcast events after connection", async () => {
    const c1 = await TestClient.connect();
    await handshake(c1);

    const c2 = await TestClient.connect();
    await handshake(c2);

    const testPayload = { msg: "hello from test" };
    server.broadcastEvent("notification", testPayload);

    const event1 = await c1.recv();
    expect(event1.type).toBe("event");
    expect(event1.event).toBe("notification");
    expect(event1.payload).toEqual(testPayload);

    const event2 = await c2.recv();
    expect(event2.type).toBe("event");
    expect(event2.event).toBe("notification");
    expect(event2.payload).toEqual(testPayload);

    c1.close();
    c2.close();
  });
});
