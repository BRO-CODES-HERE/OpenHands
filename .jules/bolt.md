## 2023-10-27 - WebSocket Broadcast Performance with Strings vs Buffers
**Learning:** When broadcasting a message to multiple connected clients using the `ws` library, passing a `String` (e.g., from `JSON.stringify()`) to `ws.send(msg)` causes the library to internally allocate a new `Buffer` from that string for *every single client*. For a large number of connected clients, this creates massive unnecessary overhead.
**Action:** When broadcasting identical payloads to multiple clients, convert the string to a `Buffer` *once* (`const buf = Buffer.from(jsonStr);`), then loop and send that buffer using `ws.send(buf, { binary: false })`. The `{ binary: false }` flag ensures the frame is sent as text, matching the original string behavior, while achieving roughly ~2x faster broadcast times.

## 2023-10-27 - WebSocket UTF-8 Validation Overhead
**Learning:** The `ws` library performs synchronous, explicit UTF-8 validation on all incoming text payloads by default, which can be computationally expensive (e.g. adding 20-30% parsing overhead). Node.js's native `Buffer.prototype.toString('utf8')` safely handles invalid UTF-8 sequences anyway.
**Action:** Use `skipUTF8Validation: true` in the `WebSocketServer` constructor options to bypass the redundant and expensive check when performance matters.
