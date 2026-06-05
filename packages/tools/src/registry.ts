import { Tool } from "@openhands/agent";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  public register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  public get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }
}
