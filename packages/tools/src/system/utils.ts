import path from "path";

/**
 * Resolves a file path and prevents path traversal vulnerabilities.
 * Ensures the resolved path stays within the current working directory.
 *
 * @param userPath The path provided by the user/agent.
 * @returns The safely resolved absolute path.
 * @throws Error if path traversal is detected.
 */
export function resolveSafePath(userPath: string): string {
  const root = process.cwd();
  const resolved = path.resolve(root, userPath);
  const relative = path.relative(root, resolved);

  // Prevent path traversal outside the root workspace directory
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected: Access to path is not allowed.`);
  }

  return resolved;
}
