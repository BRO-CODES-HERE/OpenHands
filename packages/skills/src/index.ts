import { Tool } from "@openhands/agent";

export interface SkillStep {
  tool: string;
  params: Record<string, any>;
  outputKey?: string;
}

export interface Skill {
  name: string;
  description: string;
  steps: SkillStep[];
}

export class SkillExecutor {
  private tools = new Map<string, Tool>();

  constructor(tools: Tool[] = []) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  public async execute(skill: Skill, initialContext: Record<string, string> = {}): Promise<Record<string, string>> {
    const context = { ...initialContext };

    for (const step of skill.steps) {
      const tool = this.tools.get(step.tool);
      if (!tool) {
        throw new Error(`Tool "${step.tool}" required by skill step not registered`);
      }

      const resolvedParams = this.resolveParameters(step.params, context);
      const result = await tool.execute(resolvedParams);

      if (step.outputKey) {
        context[step.outputKey] = result;
      }
    }

    return context;
  }

  private resolveParameters(params: Record<string, any>, context: Record<string, string>): any {
    return this.resolveValue(params, context);
  }

  private resolveValue(val: any, context: Record<string, string>): any {
    if (typeof val === "string") {
      return val.replace(/\{\{([^}]+)\}\}/g, (_, varName) => {
        const trimmed = varName.trim();
        return trimmed in context ? context[trimmed] : `{{${varName}}}`;
      });
    }
    if (Array.isArray(val)) {
      return val.map(v => this.resolveValue(v, context));
    }
    if (val !== null && typeof val === "object") {
      const resolved: Record<string, any> = {};
      for (const key of Object.keys(val)) {
        resolved[key] = this.resolveValue(val[key], context);
      }
      return resolved;
    }
    return val;
  }
}
