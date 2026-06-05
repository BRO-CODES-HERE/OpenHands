## 2024-05-24 - Cross-Site WebSocket Hijacking (CSWSH) in Gateway Server
**Vulnerability:** The Gateway server implementation using the `ws` package lacked `origin` validation. Any web page visited by a user could open a WebSocket connection to `ws://127.0.0.1:18999` and masquerade as the user's client.
**Learning:** `ws` (Node.js WebSocket implementation) does not check CORS or origin headers automatically. Local WebSocket APIs are extremely vulnerable to CSWSH attacks if a browser can connect to them on a loopback interface, allowing attackers to hijack local sessions and issue commands.
**Prevention:** Implement `verifyClient` in `WebSocketServer` initialization to explicitly check the `origin` header. Allow no origin (for CLI/backend usage) or strict loopback origins (`localhost`, `127.0.0.1`) if a browser connects.

## 2024-06-05 - Missing WebSocket Payload Limit (DoS Risk)
**Vulnerability:** The Gateway server implementation using the `ws` package did not specify a `maxPayload` limit. The default limit is 100MB, which allows malicious actors to send excessively large payloads, potentially causing high memory usage or crashing the server (OOM), leading to a Denial of Service (DoS).
**Learning:** Always explicitly define resource limits for publicly exposed services. The default settings of libraries like `ws` may be too permissive for a secure production environment.
**Prevention:** Configure the `maxPayload` option in `WebSocketServer` initialization to a reasonable limit (e.g., 2MB) to reject oversized frames early and protect server resources.
