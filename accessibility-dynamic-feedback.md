# UX Enhancement: Chat Accessibility and Dynamic State Feedback

## Overview
This task enhances the user experience of the OpenHands webchat UI by making dynamic states more discoverable and ensuring the interface is fully accessible to keyboard and screen reader users.

## Design Decisions
1. **Dynamic Input Placeholders:** Instead of relying solely on disabled states, the chat input now explains *why* it is disabled using dynamic placeholders (e.g., "Connect to Gateway to send messages...", "Waiting for agent..."). This provides immediate contextual feedback to the user.
2. **Focus Visible Styles:** Focus indicators were added to all `.btn` and `.delete-btn` elements using `:focus-visible` to ensure keyboard-only users can easily identify which element has focus.
3. **Screen Reader Live Regions:** The `role="log"`, `aria-live="polite"`, and `aria-atomic="false"` attributes were added to the `.messages-container` so screen readers will announce new messages automatically. The typing indicator was updated to use `role="status"` and `aria-label="Agent is typing"`.

## Implementation Details
- Modified `ui/webchat/src/App.tsx` to include `role="log"` and `aria-live` attributes on the `.messages-container`.
- Updated the typing indicator in `App.tsx` to include `role="status"` and an `aria-label`.
- Replaced the static placeholder on the chat `<input>` in `App.tsx` with a dynamic value based on the `connected`, `activeSessionId`, and `isSending` states.
- Modified `ui/webchat/src/App.css` to add `.btn:focus-visible` and `.delete-btn:focus-visible` with `outline` styling.
- Documented learnings in `.jules/palette.md`.

## Test Cases
1. **Manual Visual Test:** Verify that the chat input placeholder changes text based on application state (Disconnected -> Waiting for Session -> Waiting for Agent -> Ready).
2. **Manual Keyboard Test:** Use the `Tab` key to navigate through buttons and confirm the `.btn` and `.delete-btn` have a visible purple outline when focused.
3. **Screen Reader Test (Simulated):** Verify the presence of `role="log"` and `aria-live="polite"` on the `.messages-container` and `role="status"` on the typing indicator.

## Challenges & Resolutions
- **Issue:** Focus outlines were not visible on some buttons during keyboard navigation.
- **Resolution:** Explicitly added `.btn:focus-visible` and `.delete-btn:focus-visible` CSS rules using the design system's accent color.

## Next Steps
- Implement similar focus visibility styling for other interactive elements like selects and inputs.
- Add success/error toast notifications for asynchronous operations (like saving configuration).