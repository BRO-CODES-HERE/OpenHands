# Sentinel DoS Fix Report

## Overview
Added a `maxPayload` limit to the WebSocketServer to prevent Denial of Service (DoS) attacks caused by excessively large payloads.

## Design Decisions
- Set `maxPayload` to 2MB (2 * 1024 * 1024 bytes) instead of relying on the default 100MB limit of the `ws` package.

## Implementation Details
- Modified `apps/gateway/src/server.ts` to include `maxPayload: 2 * 1024 * 1024` in the `WebSocketServer` configuration options.
- Added a security comment explaining the purpose of the configuration.

## Test Cases
- Ran the existing test suite (`pnpm test` / `pnpm vitest run`) to ensure no functionality regressions occurred. All tests passed.

## Challenges & Resolutions
- Identified the missing payload limit as a potential DoS vector by reviewing the WebSocketServer initialization. Addressed it with a simple, standard security mitigation.

## Next Steps
- Consider further DoS prevention mechanisms such as rate limiting and connection limits per IP.
