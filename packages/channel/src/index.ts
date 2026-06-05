import { GatewayClient } from "@openhands/gateway-protocol";

export interface ChannelMessage {
  channelId: string;
  userId: string;
  messageId: string;
  content: string;
  timestamp: number;
}

export interface ChannelReply {
  channelId: string;
  userId: string;
  content: string;
}

export abstract class BaseChannel {
  protected client: GatewayClient;

  constructor(
    public readonly channelId: string,
    public readonly name: string,
    public readonly type: string,
    protected gatewayUrl: string
  ) {
    this.client = new GatewayClient();
  }

  public async start(): Promise<void> {
    await this.client.connect(this.gatewayUrl);
    
    // Register this channel instance with the gateway
    await this.client.request("channel.register", {
      channelId: this.channelId,
      name: this.name,
      type: this.type
    });

    // Listen for incoming message reply events from the gateway
    this.client.onEvent(async (event, payload: any) => {
      if (event === "agent.message.reply" && payload && payload.channelId === this.channelId) {
        await this.handleOutgoingMessage({
          channelId: payload.channelId,
          userId: payload.userId,
          content: payload.content
        });
      }
    });
  }

  public async stop(): Promise<void> {
    this.client.close();
  }

  // Route an incoming message from the platform user to the gateway
  public async sendIncomingMessage(userId: string, messageId: string, content: string): Promise<void> {
    await this.client.request("channel.message.send", {
      channelId: this.channelId,
      userId,
      messageId,
      content,
      timestamp: Date.now()
    });
  }

  // Derived classes must implement this to route outgoing messages back to platform users
  protected abstract handleOutgoingMessage(reply: ChannelReply): Promise<void>;
}
