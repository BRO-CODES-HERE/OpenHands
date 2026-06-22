## 2024-06-12 - Keyboard Accessibility for Complex Interactive Elements
**Learning:** When making clickable list items (like chat sessions) accessible via keyboard (`role="button"`, `tabIndex={0}`), nested interactive elements (like a delete button) cause issues. Pressing Enter/Space on the parent triggers its action, but if the focus is on the child button, the event might bubble up or behave unexpectedly depending on the specific keyboard event handling. Additionally, hover-only visible elements (like the delete button) are invisible to keyboard users navigating via Tab unless `:focus-within` is used on the parent container.
**Action:** Always add `e.stopPropagation()` on nested interactive elements' `onKeyDown` handlers to prevent parent actions. Use `.parent:focus-within .child { opacity: 1; }` in CSS so keyboard users can see actions that normally only appear on hover.
## 2026-06-14 - Dynamic placeholders and ARIA chat live regions
**Learning:** Providing dynamic placeholders explaining why an input is disabled significantly reduces user confusion compared to a static placeholder with a disabled attribute. Also, using role='log' and aria-live='polite' on chat containers ensures screen readers announce new messages non-disruptively.
**Action:** Always implement dynamic placeholders for conditionally disabled inputs and proper ARIA live regions for dynamically updating content streams.

## 2024-05-24 - Inline Save Feedback
**Learning:** Using blocking window.alert() calls for configuration success is highly disruptive to user flow and degrades UX. Instead, showing inline feedback directly on the button ("Saving...", "✓ Saved") gives clear confirmation without interrupting the user.
**Action:** Always favor inline UI feedback (e.g., dynamic button text, success states) over native alerts for routine success events.

## 2024-06-22 - Dynamic Placeholders and Titles for Disabled Elements
**Learning:** Elements disabled when disconnected (like inputs, selects, and buttons) should use dynamic placeholders and `title` attributes explaining why they are disabled. This gives clearer feedback to users about what state is preventing interaction instead of simply being a static disabled input.
**Action:** Implemented dynamic `title` properties on the connection input and configuration forms to indicate the reason why the element is disabled, as well as added an informative placeholder to the URL input.
