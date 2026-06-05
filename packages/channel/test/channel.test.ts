import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GatewayServer } from "@openhands/gateway";
import { BaseChannel, ChannelReply } from "../src/index.js";

const HOST = "127.0.0.1";
const PORT = 18997;
const GATEWAY_URL = `ws://${HOST}:${PORT}`;

let server: GatewayServer;

beforeAll(async () => {
  server = new GatewayServer({ host: HOST, port: PORT });
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

class MockChannel extends BaseChannel {
  public replies: ChannelReply[] = [];

  constructor(channelId: string, name: string, type: string, gatewayUrl: string) {
    super(channelId, name, type, gatewayUrl);
  }

  protected async handleOutgoingMessage(reply: ChannelReply): Promise<void> {
    this.replies.push(reply);
  }
}

describe("BaseChannel Integration Flow", () => {
  it("completes full channel lifecycle: connects, registers, sends, and receives responses", async () => {
    const channel = new MockChannel(
      "test-chan-123",
      "Test Channel",
      "mock",
      GATEWAY_URL
    );

    // Start channel connection and registration
    await channel.start();

    // Send an incoming message from a user on the platform
    await channel.sendIncomingMessage("user-abc", "msg-001", "hello from channel!");

    // Wait for the simulated gateway agent reply to trigger and get processed
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(channel.replies).toHaveLength(1);
    expect(channel.replies[0]).toEqual({
      channelId: "test-chan-123",
      userId: "user-abc",
      content: 'Mock Agent reply: received "hello from channel!"'
    });

    await channel.stop();
  });
});
