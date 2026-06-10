## 2025-06-06 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found an accessibility issue pattern in the app's components where icon-only buttons (like the session delete '✕' button) were missing both ARIA labels for screen readers and title tooltips for mouse users, resulting in poor accessibility and reduced context.
**Action:** Always ensure icon-only buttons have descriptive `aria-label` and `title` attributes so their function is clear to all users, regardless of how they navigate the interface.

## 2025-06-07 - Missing Form Labels and Disabled State Explanations
**Learning:** Found a pattern where form fields in the configuration sidebar lacked programmatic label associations (htmlFor/id), which reduces the click target area and degrades screen reader experience. Additionally, primary action buttons were disabled without context as to why.
**Action:** Always link `<label>` elements to their corresponding inputs using `htmlFor` and `id`. When disabling primary buttons, provide a `title` attribute explaining the requirement (e.g., "Connect to Gateway first").

## 2025-06-10 - Keyboard Accessibility for Nested Interactive Elements
**Learning:** Found a common pattern where hover-only UI elements (like a delete button inside a list item) are completely invisible to keyboard users. Additionally, when nested interactive elements both handle keyboard events, pressing Enter/Space on the child unintentionally triggers the parent's action as well.
**Action:** Always use `:focus-within` on parent containers to ensure hover-only UI elements become visible during keyboard navigation. Also, ensure nested interactive elements have explicit `e.stopPropagation()` handlers for keyboard events (like Enter/Space) to prevent bubbling up and triggering unintended parent actions.
