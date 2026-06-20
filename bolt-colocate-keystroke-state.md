# Bolt Colocate Keystroke State Performance Optimization

## Overview
Optimized keystroke performance in the webchat application by colocating the highly volatile `inputText` state from the global `App` component into a newly extracted and isolated `ChatInput` component.

## Design Decisions
- In React, whenever state updates, the component and all its children re-render.
- By keeping the `inputText` state in the top-level `App` component, every single keystroke in the input field triggered a full re-render of the entire application, including the sidebar, sessions list, and all chat messages.
- This creates an O(N) performance bottleneck relative to the complexity of the application and the size of the DOM.
- The decision was made to extract the chat input into a separate component, `ChatInput`, and wrap it with `React.memo()`. The `inputText` state was moved into this new component.

## Implementation Details
- Modified `ui/webchat/src/App.tsx`.
- Defined a `ChatInput` component (wrapped in `React.memo()`) outside the `App` component body to prevent recreation of the component reference on every render.
- Moved the `[inputText, setInputText]` state and `handleSubmit` logic into `ChatInput`.
- Changed `handleSendMessage` in the `App` component to accept the text string directly from the `ChatInput` via an `onSend` callback prop.

## Test Cases
- Ran linter via `pnpm lint` to verify no syntax or type errors.
- Built the frontend via `pnpm --filter webchat build` to verify standard compilation.
- Used Playwright visually to confirm the input rendered and behaved correctly.

## Challenges & Resolutions
- Ensuring that `handleSendMessage` in `App` would receive the message without relying on its own state. Resolved by passing the message explicitly through the `onSend` prop.
- Making sure the component extraction did not leave trailing tags or break HTML structure in the main file.

## Next Steps
- Evaluate other areas in the app where global state might be causing unnecessary re-renders.
- Consider using React Context or a state management library for deeper prop drilling cases if they arise, although colocated state should be preferred for volatile local state like input values.
