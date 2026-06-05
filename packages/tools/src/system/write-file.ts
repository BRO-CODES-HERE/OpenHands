import fs from "fs/promises";
import path from "path";
import { Tool } from "@openhands/agent";

export class WriteFileTool implements Tool {
  public name = "write_file";
  public description = "Writes content to a file. Overwrites if it exists, and creates directories if needed.";
  public parameters = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path to the file to write."
      },
      content: {
        type: "string",
        description: "The content to write to the file."
      }
    },
    required: ["path", "content"]
  };

  public async execute(args: { path: string; content: string }): Promise<string> {
    if (!args.path) {
      throw new Error("Parameter 'path' is required");
    }
    if (args.content === undefined) {
      throw new Error("Parameter 'content' is required");
    }
    const targetPath = path.resolve(args.path);
    const parentDir = path.dirname(targetPath);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(targetPath, args.content, "utf-8");
    return `File successfully written to ${targetPath}`;
  }
}
