import fs from "fs/promises";
import path from "path";
import { Tool } from "@openhands/agent";

export class ListDirTool implements Tool {
  public name = "list_dir";
  public description = "Lists the files and directories inside a specified path.";
  public parameters = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The directory path to list."
      }
    },
    required: ["path"]
  };

  public async execute(args: { path: string }): Promise<string> {
    if (!args.path) {
      throw new Error("Parameter 'path' is required");
    }
    const targetPath = path.resolve(args.path);

    // SECURITY: Prevent path traversal by ensuring the target path is inside the workspace
    const cwd = process.cwd();
    if (!targetPath.startsWith(cwd) || (targetPath !== cwd && !targetPath.startsWith(cwd + path.sep))) {
      throw new Error(`Access denied: Path traversal detected. Path must be within ${cwd}`);
    }

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const items = entries.map(entry => {
      const type = entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other";
      return `${entry.name} (${type})`;
    });
    return items.join("\n") || "(empty directory)";
  }
}
