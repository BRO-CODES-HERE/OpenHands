export type Role = "user" | "assistant" | "system" | "tool";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface Message {
  role: Role;
  content: string;
  name?: string; // used for tool results
  tool_calls?: ToolCall[];
  tool_call_id?: string; // used for tool results
}

export interface Tool {
  name: string;
  description: string;
  parameters: any; // JSON schema object
  execute: (args: any) => Promise<string>;
}

export interface LLMResponse {
  message: Message;
}

export interface LLMProvider {
  generateResponse(messages: Message[], tools?: Tool[]): Promise<LLMResponse>;
}

export class Agent {
  private messages: Message[] = [];

  constructor(
    private llmProvider: LLMProvider,
    private tools: Tool[] = [],
    private systemPrompt?: string
  ) {
    if (systemPrompt) {
      this.messages.push({ role: "system", content: systemPrompt });
    }
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public addMessage(message: Message) {
    this.messages.push(message);
  }

  public async run(userMessage: string, maxIterations: number = 10): Promise<string> {
    if (!userMessage || userMessage.trim() === "") {
      throw new Error("User message cannot be empty");
    }

    this.messages.push({ role: "user", content: userMessage });

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.llmProvider.generateResponse(this.messages, this.tools);
      const assistantMessage = response.message;

      this.messages.push(assistantMessage);

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Execute all tool calls
        // ⚡ Bolt: Execute tools concurrently rather than sequentially
        const toolExecutionPromises = assistantMessage.tool_calls.map(async (toolCall) => {
          if (toolCall.type === "function") {
            const tool = this.tools.find(t => t.name === toolCall.function.name);

            if (!tool) {
              return {
                role: "tool" as Role,
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: `Error: Tool ${toolCall.function.name} not found.`
              };
            }

            try {
              const args = JSON.parse(toolCall.function.arguments);
              const result = await tool.execute(args);
              return {
                role: "tool" as Role,
                tool_call_id: toolCall.id,
                name: tool.name,
                content: result
              };
            } catch (e: any) {
              return {
                role: "tool" as Role,
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: `Error: Failed to execute tool: ${e.message}`
              };
            }
          }
          return null;
        });

        const toolResults = await Promise.all(toolExecutionPromises);
        for (const result of toolResults) {
          if (result) {
            this.messages.push(result);
          }
        }
        // Loop continues to get the next response from LLM using the tool results
      } else {
        return assistantMessage.content;
      }
    }

    throw new Error(`Agent stopped after reaching max iterations (${maxIterations})`);
  }
}

export * from "./providers/openai.js";
export * from "./providers/gemini.js";
export * from "./providers/anthropic.js";
