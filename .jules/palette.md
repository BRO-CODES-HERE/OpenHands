## 2025-06-06 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found an accessibility issue pattern in the app's components where icon-only buttons (like the session delete '✕' button) were missing both ARIA labels for screen readers and title tooltips for mouse users, resulting in poor accessibility and reduced context.
**Action:** Always ensure icon-only buttons have descriptive `aria-label` and `title` attributes so their function is clear to all users, regardless of how they navigate the interface.
