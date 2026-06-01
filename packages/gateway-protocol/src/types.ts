export interface ClientInfo {
  id: string;
  version: string;
  platform: string;
}

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: ClientInfo;
  auth?: { token: string };
}

export interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface EventFrame {
  type: "event";
  event: string;
  payload?: unknown;
}

export type Frame = RequestFrame | ResponseFrame | EventFrame;

export interface ErrorInfo {
  code: string;
  message: string;
}
