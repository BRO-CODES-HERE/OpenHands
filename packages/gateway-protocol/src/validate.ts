import type {
  RequestFrame,
  ResponseFrame,
  EventFrame,
  ConnectParams,
} from "./types.js";

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function validateRequestFrame(raw: unknown): raw is RequestFrame {
  if (!isObject(raw)) return false;
  if (raw.type !== "req") return false;
  if (!isString(raw.id) || raw.id.length === 0) return false;
  if (!isString(raw.method) || raw.method.length === 0) return false;
  if (raw.params !== undefined && !isObject(raw.params)) return false;
  return true;
}

export function validateResponseFrame(raw: unknown): raw is ResponseFrame {
  if (!isObject(raw)) return false;
  if (raw.type !== "res") return false;
  if (!isString(raw.id)) return false;
  if (!isBoolean(raw.ok)) return false;
  return true;
}

export function validateEventFrame(raw: unknown): raw is EventFrame {
  if (!isObject(raw)) return false;
  if (raw.type !== "event") return false;
  if (!isString(raw.event) || raw.event.length === 0) return false;
  return true;
}

export function validateConnectParams(raw: unknown): raw is ConnectParams {
  if (!isObject(raw)) return false;
  if (!isNumber(raw.minProtocol)) return false;
  if (!isNumber(raw.maxProtocol)) return false;
  if (!isObject(raw.client)) return false;
  const client = raw.client as Record<string, unknown>;
  if (!isString(client.id)) return false;
  if (!isString(client.version)) return false;
  if (!isString(client.platform)) return false;
  if (raw.auth !== undefined) {
    if (!isObject(raw.auth)) return false;
    const auth = raw.auth as Record<string, unknown>;
    if (!isString(auth.token)) return false;
  }
  return true;
}

export function validateHelloOkPayload(raw: unknown): raw is {
  protocolVersion: number;
  connectionId: string;
  serverInfo: { version: string };
  features: { methods: string[]; events: string[] };
} {
  if (!isObject(raw)) return false;
  if (!isNumber(raw.protocolVersion)) return false;
  if (!isString(raw.connectionId)) return false;
  if (!isObject(raw.serverInfo)) return false;
  if (!isString((raw.serverInfo as Record<string, unknown>).version))
    return false;
  if (!isObject(raw.features)) return false;
  const features = raw.features as Record<string, unknown>;
  if (!Array.isArray(features.methods)) return false;
  if (!features.methods.every((m: unknown) => isString(m))) return false;
  if (!Array.isArray(features.events)) return false;
  if (!features.events.every((e: unknown) => isString(e))) return false;
  return true;
}
