## 2025-06-06 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found an accessibility issue pattern in the app's components where icon-only buttons (like the session delete '✕' button) were missing both ARIA labels for screen readers and title tooltips for mouse users, resulting in poor accessibility and reduced context.
**Action:** Always ensure icon-only buttons have descriptive `aria-label` and `title` attributes so their function is clear to all users, regardless of how they navigate the interface.

## 2025-06-07 - Missing Form Labels and Disabled State Explanations
**Learning:** Found a pattern where form fields in the configuration sidebar lacked programmatic label associations (htmlFor/id), which reduces the click target area and degrades screen reader experience. Additionally, primary action buttons were disabled without context as to why.
**Action:** Always link `<label>` elements to their corresponding inputs using `htmlFor` and `id`. When disabling primary buttons, provide a `title` attribute explaining the requirement (e.g., "Connect to Gateway first").

## 2025-06-10 - Keyboard Accessibility for Nested Interactive Elements
**Learning:** Encountered an issue where interactive child elements (like a delete button) were hidden until hovered, making them inaccessible via keyboard. Additionally, triggering a nested interactive element via keyboard could unintentionally trigger the parent's keyboard event handler.
**Action:** Always use `:focus-within` on parent containers so that hidden UI elements appear when any child receives focus. Furthermore, explicitly call `e.stopPropagation()` in keyboard event handlers (like Enter/Space) of nested elements to prevent bubbling to the parent's handlers.
