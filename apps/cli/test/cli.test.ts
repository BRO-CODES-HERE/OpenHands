import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GatewayServer } from "../../gateway/src/server.js";
import { GatewayClient } from "@openhands/gateway-protocol";

const HOST = "127.0.0.1";
const PORT = 18998;
const WS_URL = `ws://${HOST}:${PORT}`;

let server: GatewayServer;

beforeAll(async () => {
  server = new GatewayServer({ host: HOST, port: PORT });
  await server.start();
}, 5000);

afterAll(async () => {
  await server.stop();
}, 5000);

describe("GatewayClient", () => {
  it("should connect and complete handshake", async () => {
    const client = new GatewayClient();
    const info = await client.connect(WS_URL);
    expect(info.protocolVersion).toBe(1);
    expect(info.connectionId).toBeTruthy();
    expect(info.serverInfo.version).toBe("0.0.1");
    expect(info.features.methods).toContain("health");
    expect(info.features.methods).toContain("ping");
    expect(info.features.events).toContain("connect.challenge");
    expect(info.features.events).toContain("notification");
    expect(client.connectionId).toBe(info.connectionId);
    client.close();
  });

  it("should reject invalid server URL", async () => {
    const client = new GatewayClient();
    await expect(client.connect("ws://127.0.0.1:1")).rejects.toThrow();
  });

  it("should call health method", async () => {
    const client = new GatewayClient();
    await client.connect(WS_URL);
    const result = await client.request("health") as Record<string, unknown>;
    expect(result.status).toBe("ok");
    expect(typeof result.uptime).toBe("number");
    expect(typeof result.timestamp).toBe("number");
    client.close();
  });

  it("should call ping method", async () => {
    const client = new GatewayClient();
    await client.connect(WS_URL);
    const result = await client.request("ping") as Record<string, unknown>;
    expect(result.pong).toBe(true);
    expect(typeof result.timestamp).toBe("number");
    client.close();
  });

  it("should return error for unknown method", async () => {
    const client = new GatewayClient();
    await client.connect(WS_URL);
    await expect(client.request("nonexistent")).rejects.toThrow("METHOD_NOT_FOUND");
    client.close();
  });

  it("should receive broadcast events", async () => {
    const client = new GatewayClient();
    await client.connect(WS_URL);

    const events: { event: string; payload?: unknown }[] = [];
    client.onEvent((event, payload) => {
      events.push({ event, payload });
    });

    const testPayload = { msg: "cli-test-event" };
    server.broadcastEvent("notification", testPayload);

    await new Promise((r) => setTimeout(r, 200));
    expect(events.length).toBe(1);
    expect(events[0].event).toBe("notification");
    expect(events[0].payload).toEqual(testPayload);
    client.close();
  });

  it("should throw when making request after close", async () => {
    const client = new GatewayClient();
    await client.connect(WS_URL);
    client.close();
    await expect(client.request("health")).rejects.toThrow("Not connected");
  });
});
