## 2025-06-06 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found an accessibility issue pattern in the app's components where icon-only buttons (like the session delete '✕' button) were missing both ARIA labels for screen readers and title tooltips for mouse users, resulting in poor accessibility and reduced context.
**Action:** Always ensure icon-only buttons have descriptive `aria-label` and `title` attributes so their function is clear to all users, regardless of how they navigate the interface.

## 2025-06-07 - Missing Form Labels and Disabled State Explanations
**Learning:** Found a pattern where form fields in the configuration sidebar lacked programmatic label associations (htmlFor/id), which reduces the click target area and degrades screen reader experience. Additionally, primary action buttons were disabled without context as to why.
**Action:** Always link `<label>` elements to their corresponding inputs using `htmlFor` and `id`. When disabling primary buttons, provide a `title` attribute explaining the requirement (e.g., "Connect to Gateway first").

## 2025-06-08 - Keyboard Navigation Issues with Nested Interactive Elements
**Learning:** Discovered an accessibility trap where keyboard users couldn't easily access secondary actions (like a delete button) because they were only visible on mouse hover, and pressing 'Enter'/'Space' on the nested button accidentally triggered the parent container's click action too.
**Action:** Always use `:focus-within` to reveal hover-only UI elements during keyboard navigation. Additionally, explicitly add `e.stopPropagation()` in keyboard event handlers (`onKeyDown`) for nested interactive elements to prevent parent actions from triggering unintentionally.
