## 2024-06-08 - Accessible Nested Actions in Lists

**Learning:** When implementing keyboard accessibility for interactive list rows (like chat sessions) that contain nested interactive actions (like a delete button), event propagation must be carefully managed. If the row has an `onKeyDown` handler for Enter/Space to select it, the nested button must call `e.stopPropagation()` on those same keys, otherwise activating the button will unintentionally trigger the row's selection logic as well. Additionally, elements that are hidden until hover (like delete buttons) must be made visible via `:focus-within` on the parent container, so they are visible during keyboard navigation.

**Action:** Ensure that all nested interactive elements inside clickable containers have explicit `e.stopPropagation()` handlers for keyboard events in addition to click events. Use `:focus-within` to manage visibility of nested controls so they are accessible to keyboard users.
## 2024-06-08 - Accessible Nested Actions in Lists

**Learning:** When implementing keyboard accessibility for interactive list rows (like chat sessions) that contain nested interactive actions (like a delete button), event propagation must be carefully managed. If the row has an `onKeyDown` handler for Enter/Space to select it, the nested button must call `e.stopPropagation()` on those same keys, otherwise activating the button will unintentionally trigger the row's selection logic as well. Additionally, elements that are hidden until hover (like delete buttons) must be made visible via `:focus-within` on the parent container, so they are visible during keyboard navigation.

**Action:** Ensure that all nested interactive elements inside clickable containers have explicit `e.stopPropagation()` handlers for keyboard events in addition to click events. Use `:focus-within` to manage visibility of nested controls so they are accessible to keyboard users.
