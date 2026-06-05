import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../src/registry.js";
import { Tool } from "@openhands/agent";

describe("ToolRegistry", () => {
  it("should register and retrieve tools", () => {
    const registry = new ToolRegistry();
    const mockTool: Tool = {
      name: "test_tool",
      description: "A test tool",
      parameters: {},
      execute: async () => "result"
    };

    expect(registry.has("test_tool")).toBe(false);
    registry.register(mockTool);
    expect(registry.has("test_tool")).toBe(true);
    expect(registry.get("test_tool")).toBe(mockTool);
    expect(registry.getAll()).toEqual([mockTool]);
  });

  it("should throw error when registering duplicate tool names", () => {
    const registry = new ToolRegistry();
    const toolA: Tool = {
      name: "duplicate",
      description: "Tool A",
      parameters: {},
      execute: async () => "A"
    };
    const toolB: Tool = {
      name: "duplicate",
      description: "Tool B",
      parameters: {},
      execute: async () => "B"
    };

    registry.register(toolA);
    expect(() => registry.register(toolB)).toThrow('Tool "duplicate" is already registered');
  });

  it("should return undefined for non-existent tools", () => {
    const registry = new ToolRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });
});
