import {
  validateConnectParams,
  PROTOCOL_VERSION,
  type RequestFrame,
  type ResponseFrame,
} from "@openhands/gateway-protocol";

export interface ConnectedClient {
  id: string;
  connectionId: string;
  platform: string;
  version: string;
}

const clients = new Map<string, ConnectedClient>();

export function getClient(connectionId: string): ConnectedClient | undefined {
  return clients.get(connectionId);
}

export function removeClient(connectionId: string): void {
  clients.delete(connectionId);
}

export function handleConnect(
  req: RequestFrame,
  _nonce: string,
  sendResponse: (frame: ResponseFrame) => void
): ConnectedClient | null {
  if (!validateConnectParams(req.params)) {
    sendResponse({
      type: "res",
      id: req.id,
      ok: false,
      error: {
        code: "INVALID_PARAMS",
        message: "Invalid connect params: expected minProtocol, maxProtocol, and client",
      },
    });
    return null;
  }

  const params = req.params;

  if (params.minProtocol > PROTOCOL_VERSION || params.maxProtocol < PROTOCOL_VERSION) {
    sendResponse({
      type: "res",
      id: req.id,
      ok: false,
      error: {
        code: "PROTOCOL_MISMATCH",
        message: `Server protocol version ${PROTOCOL_VERSION} is not in client range [${params.minProtocol}, ${params.maxProtocol}]`,
      },
    });
    return null;
  }

  const connectionId = crypto.randomUUID();
  const client: ConnectedClient = {
    id: params.client.id,
    connectionId,
    platform: params.client.platform,
    version: params.client.version,
  };
  clients.set(connectionId, client);

  sendResponse({
    type: "res",
    id: req.id,
    ok: true,
    payload: {
      protocolVersion: PROTOCOL_VERSION,
      connectionId,
      serverInfo: {
        version: "0.0.1",
      },
      features: {
        methods: ["health", "ping"],
        events: ["connect.challenge", "notification"],
      },
    },
  });

  return client;
}
