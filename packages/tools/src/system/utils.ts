import path from "path";

export function resolveSafePath(requestedPath: string): string {
  const rootDir = process.cwd();
  const absolutePath = path.resolve(rootDir, requestedPath);

  const relative = path.relative(rootDir, absolutePath);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("Path traversal denied: Path must be within the workspace");
  }

  return absolutePath;
}
