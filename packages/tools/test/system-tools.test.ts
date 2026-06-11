import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReadFileTool } from "../src/system/read-file.js";
import { WriteFileTool } from "../src/system/write-file.js";
import { ListDirTool } from "../src/system/list-dir.js";
import { CalculatorTool } from "../src/system/calculator.js";
import fs from "fs/promises";
import path from "path";

describe("System Tools", () => {
  const tempDir = path.join(process.cwd(), "test-temp-system-tools");

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("WriteFileTool & ReadFileTool", () => {
    it("should write content to file and read it back", async () => {
      const writeFileTool = new WriteFileTool();
      const readFileTool = new ReadFileTool();
      const testFilePath = path.join(tempDir, "subfolder", "test.txt");

      const writeResult = await writeFileTool.execute({
        path: testFilePath,
        content: "Hello from OpenHands Tool!"
      });
      expect(writeResult).toContain("File successfully written");

      const fileExists = await fs.stat(testFilePath);
      expect(fileExists.isFile()).toBe(true);

      const readResult = await readFileTool.execute({
        path: testFilePath
      });
      expect(readResult).toBe("Hello from OpenHands Tool!");
    });

    it("should throw error if required parameters are missing", async () => {
      const writeFileTool = new WriteFileTool();
      const readFileTool = new ReadFileTool();

      await expect(writeFileTool.execute({ path: "", content: "hi" })).rejects.toThrow("Parameter 'path' is required");
      await expect(writeFileTool.execute({ path: "test.txt", content: undefined as any })).rejects.toThrow("Parameter 'content' is required");
      await expect(readFileTool.execute({ path: "" })).rejects.toThrow("Parameter 'path' is required");
    });

    it("should deny path traversal attempts", async () => {
      const writeFileTool = new WriteFileTool();
      const readFileTool = new ReadFileTool();

      await expect(writeFileTool.execute({ path: "../../../etc/passwd", content: "hacked" }))
        .rejects.toThrow("Path traversal denied: Path must be within the workspace");
      await expect(readFileTool.execute({ path: "/tmp/secret.txt" }))
        .rejects.toThrow("Path traversal denied: Path must be within the workspace");
    });
  });

  describe("ListDirTool", () => {
    it("should list entries inside directory", async () => {
      const listDirTool = new ListDirTool();
      await fs.writeFile(path.join(tempDir, "file1.txt"), "content");
      await fs.mkdir(path.join(tempDir, "folder1"));

      const result = await listDirTool.execute({ path: tempDir });
      const lines = result.split("\n");
      expect(lines).toContain("file1.txt (file)");
      expect(lines).toContain("folder1 (directory)");
    });

    it("should return empty directory message if empty", async () => {
      const listDirTool = new ListDirTool();
      const result = await listDirTool.execute({ path: tempDir });
      expect(result).toBe("(empty directory)");
    });

    it("should deny path traversal attempts", async () => {
      const listDirTool = new ListDirTool();

      await expect(listDirTool.execute({ path: "../../../" }))
        .rejects.toThrow("Path traversal denied: Path must be within the workspace");
      await expect(listDirTool.execute({ path: "/etc" }))
        .rejects.toThrow("Path traversal denied: Path must be within the workspace");
    });
  });

  describe("CalculatorTool", () => {
    it("should evaluate safe arithmetic expressions", async () => {
      const calculator = new CalculatorTool();
      
      expect(await calculator.execute({ expression: "2 + 2" })).toBe("4");
      expect(await calculator.execute({ expression: "10 * (3 + 2)" })).toBe("50");
      expect(await calculator.execute({ expression: "15 / 2" })).toBe("7.5");
      expect(await calculator.execute({ expression: "12 % 5" })).toBe("2");
    });

    it("should reject malicious code injections", async () => {
      const calculator = new CalculatorTool();

      await expect(calculator.execute({ expression: "console.log('hi')" })).rejects.toThrow("Invalid characters");
      await expect(calculator.execute({ expression: "process.exit(1)" })).rejects.toThrow("Invalid characters");
      await expect(calculator.execute({ expression: "require('fs')" })).rejects.toThrow("Invalid characters");
      await expect(calculator.execute({ expression: "2 + alert(1)" })).rejects.toThrow("Invalid characters");
    });

    it("should throw error for invalid arithmetic or division by zero", async () => {
      const calculator = new CalculatorTool();

      await expect(calculator.execute({ expression: "1 / 0" })).rejects.toThrow("infinite value");
      await expect(calculator.execute({ expression: "2 + * 3" })).rejects.toThrow("Failed to evaluate");
    });
  });
});
