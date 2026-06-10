import path from "path";

/**
 * Resolves a target path and ensures it does not escape the current workspace directory.
 * @param targetPath The path provided by the user/tool.
 * @returns The resolved, absolute safe path.
 * @throws Error if the path attempts to traverse outside the workspace.
 */
export function resolveSafePath(targetPath: string): string {
  const workspaceDir = process.cwd();
  const resolvedPath = path.resolve(workspaceDir, targetPath);
  const relative = path.relative(workspaceDir, resolvedPath);

  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error(`Access denied: Path ${targetPath} is outside the workspace.`);
  }

  return resolvedPath;
}
