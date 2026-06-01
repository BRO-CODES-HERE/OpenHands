import type { ResponseFrame, RequestFrame } from "@openhands/gateway-protocol";

export function handleHealth(
  _req: RequestFrame,
  sendResponse: (frame: ResponseFrame) => void
): void {
  sendResponse({
    type: "res",
    id: _req.id,
    ok: true,
    payload: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
    },
  });
}
