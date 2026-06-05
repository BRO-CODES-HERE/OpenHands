import fs from "fs/promises";
import path from "path";
import { Tool } from "@openhands/agent";

export class ReadFileTool implements Tool {
  public name = "read_file";
  public description = "Reads the contents of a file as a UTF-8 string.";
  public parameters = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path to the file to read."
      }
    },
    required: ["path"]
  };

  public async execute(args: { path: string }): Promise<string> {
    if (!args.path) {
      throw new Error("Parameter 'path' is required");
    }
    const targetPath = path.resolve(args.path);
    const content = await fs.readFile(targetPath, "utf-8");
    return content;
  }
}
