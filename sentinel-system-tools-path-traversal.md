# Sentinel: Path Traversal Vulnerability Fix in System Tools

## Overview
A path traversal vulnerability was identified in the `ReadFileTool`, `WriteFileTool`, and `ListDirTool` within the `@openhands/tools` package. These tools used `path.resolve()` on user-provided path inputs without any validation to ensure the resulting path remained within the intended workspace directory (`process.cwd()`). This vulnerability could allow an agent (or a user interacting with the agent) to read, overwrite, or list sensitive files on the host filesystem (e.g., `/etc/passwd` or configuration files outside the project root). The issue was fixed by introducing a centralized `resolveSafePath` utility function that strictly enforces directory boundaries.

## Design Decisions
*   **Centralized Validation:** Created a dedicated `resolveSafePath` function in `packages/tools/src/system/utils.ts`. This ensures consistent path validation logic across all file-system tools and makes it easier to test and maintain.
*   **Strict Boundary Enforcement:** The validation logic resolves the given path relative to `process.cwd()` and then calculates the relative path back from `process.cwd()`. If the relative path starts with `..` or is an absolute path, it means the resolved path has escaped the workspace directory, and an error is immediately thrown.
*   **Fail Securely:** The tools throw a clear "Access denied" error when a path traversal attempt is detected, preventing any file system operations from executing.

## Implementation Details
1.  **`packages/tools/src/system/utils.ts`:**
    *   Implemented `resolveSafePath(targetPath: string): string`.
    *   Uses `path.resolve(process.cwd(), targetPath)` to get the absolute path.
    *   Uses `path.relative(process.cwd(), resolvedPath)` to check the bounds.
    *   Throws `Error(\`Access denied: Path \${targetPath} is outside the workspace.\`)` if bounds are violated.
2.  **`packages/tools/src/system/read-file.ts`:**
    *   Replaced `path.resolve(args.path)` with `resolveSafePath(args.path)`.
3.  **`packages/tools/src/system/write-file.ts`:**
    *   Replaced `path.resolve(args.path)` with `resolveSafePath(args.path)`.
4.  **`packages/tools/src/system/list-dir.ts`:**
    *   Replaced `path.resolve(args.path)` with `resolveSafePath(args.path)`.

## Test Cases
Tests were added to `packages/tools/test/system-tools.test.ts` to verify the fix:
*   **`WriteFileTool & ReadFileTool` Block:** Added an `it` block ensuring that `writeFileTool.execute({ path: "../../../etc/passwd", content: "hacked" })` and `readFileTool.execute({ path: "../../../etc/passwd" })` both reject with the "Access denied" error.
*   **`ListDirTool` Block:** Added an `it` block ensuring that `listDirTool.execute({ path: "../../../etc" })` rejects with the "Access denied" error.

## Challenges & Resolutions
*   **Relative Path Calculation:** Determining whether a resolved path escapes a root directory can be tricky across different operating systems. Using `path.relative()` provides a robust, cross-platform way to check this by verifying if the resulting relative string starts with `..`.

## Next Steps
*   Review other parts of the application (e.g., plugin loader, configuration parser) that accept file paths as input to ensure they are also protected against path traversal.
