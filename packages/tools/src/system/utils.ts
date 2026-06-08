import path from "path";

export function getSafePath(inputPath: string): string {
  const workspaceDir = process.cwd();
  const targetPath = path.resolve(workspaceDir, inputPath);
  const relative = path.relative(workspaceDir, targetPath);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("Access denied: Path is outside the workspace directory.");
  }
  return targetPath;
}
