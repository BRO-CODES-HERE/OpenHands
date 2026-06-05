import { Message, Tool, LLMResponse, LLMProvider } from "../index.js";

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; model?: string; baseUrl?: string }) {
    if (!options.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = options.apiKey;
    this.model = options.model || "gpt-4o";
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
  }

  async generateResponse(messages: Message[], tools?: Tool[]): Promise<LLMResponse> {
    const formattedMessages = messages.map(msg => {
      const formatted: any = {
        role: msg.role,
        content: msg.content || ""
      };
      if (msg.name) {
        formatted.name = msg.name;
      }
      if (msg.tool_calls) {
        formatted.tool_calls = msg.tool_calls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }));
      }
      if (msg.tool_call_id) {
        formatted.tool_call_id = msg.tool_call_id;
      }
      return formatted;
    });

    const formattedTools = tools && tools.length > 0 ? tools.map(t => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    })) : undefined;

    const requestBody: any = {
      model: this.model,
      messages: formattedMessages
    };

    if (formattedTools) {
      requestBody.tools = formattedTools;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // ignore JSON parse error for error responses
      }
      throw new Error(`OpenAI API request failed: ${errorMessage}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error("OpenAI API returned an empty or invalid response");
    }

    const assistantMsg = choice.message;
    const resultMsg: Message = {
      role: "assistant",
      content: assistantMsg.content || ""
    };

    if (assistantMsg.tool_calls) {
      resultMsg.tool_calls = assistantMsg.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));
    }

    return {
      message: resultMsg
    };
  }
}
