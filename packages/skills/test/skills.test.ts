import { describe, it, expect } from "vitest";
import { Tool } from "@openhands/agent";
import { Skill, SkillExecutor } from "../src/index.js";

const upperCaseTool: Tool = {
  name: "uppercase",
  description: "Convert text to uppercase",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string" }
    },
    required: ["text"]
  },
  execute: async (args: any) => {
    return args.text.toUpperCase();
  }
};

const greetTool: Tool = {
  name: "greet",
  description: "Greet a name",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" }
    },
    required: ["name"]
  },
  execute: async (args: any) => {
    return `Hello, ${args.name}!`;
  }
};

describe("Skills System", () => {
  it("should execute a composite skill with parameter chaining", async () => {
    const executor = new SkillExecutor([upperCaseTool, greetTool]);
    
    const skill: Skill = {
      name: "upper_greet",
      description: "Convert a name to uppercase, then greet",
      steps: [
        {
          tool: "uppercase",
          params: { text: "{{input_name}}" },
          outputKey: "loud_name"
        },
        {
          tool: "greet",
          params: { name: "{{loud_name}}" },
          outputKey: "final_greeting"
        }
      ]
    };

    const context = await executor.execute(skill, { input_name: "alice" });
    expect(context.loud_name).toBe("ALICE");
    expect(context.final_greeting).toBe("Hello, ALICE!");
  });

  it("should throw an error if a tool is not registered", async () => {
    const executor = new SkillExecutor([upperCaseTool]);
    
    const skill: Skill = {
      name: "bad_skill",
      description: "Uses unregistered tool",
      steps: [
        {
          tool: "missing_tool",
          params: {}
        }
      ]
    };

    await expect(executor.execute(skill)).rejects.toThrow(
      'Tool "missing_tool" required by skill step not registered'
    );
  });
});
