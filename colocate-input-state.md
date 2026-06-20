# Colocate Keystroke State Optimization

## Overview
This task implements a performance optimization in the webchat UI to prevent expensive global re-renders on every keystroke in the chat input.

## Design Decisions
The primary issue was that the `inputText` state was held in the root `App` component. Because React re-renders the component and all its children whenever state changes, every single keystroke triggered a re-render of the entire `App`, including the potentially long list of messages in the chat history. To solve this, the text input and its state were colocated into a newly extracted, memoized `ChatInput` component.

## Implementation Details
1. Extracted the `<footer className="chat-footer">` JSX from `App.tsx` into a new `ChatInput` component wrapped in `React.memo()`.
2. Moved the `inputText` state (`useState("")`) from `App` to `ChatInput`.
3. Updated the `handleSendMessage` function in `App` to accept the input string directly as an argument, rather than reading it from global state.
4. Passed `handleSendMessage` as a prop (`onSendMessage`) to `ChatInput`.
5. The `ChatInput` component was defined *outside* the `App` component to ensure its reference is stable and `React.memo` functions correctly without DOM thrashing.

## Test Cases
- Tested entering text into the input field to verify it still functions.
- Verified that sending a message clears the input field.
- Verified the component behaves correctly regarding disabled states (e.g. when disconnected, or when sending).
- Passed ESLint and TypeScript compilation.

## Challenges & Resolutions
- Had to ensure that the `ChatInput` component was defined entirely outside the main `App` function block. If defined inside, the function reference would be recreated on every parent render, defeating the memoization and causing DOM thrashing.

## Next Steps
- Continue monitoring the application for other instances where highly volatile state (like typing, dragging, or animations) is lifted too high in the component tree, and colocate them where possible.