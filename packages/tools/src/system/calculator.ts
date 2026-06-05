import { Tool } from "@openhands/agent";

export class CalculatorTool implements Tool {
  public name = "calculator";
  public description = "Evaluates basic mathematical expressions safely.";
  public parameters = {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "The mathematical expression to evaluate (e.g., '2 * (3 + 5)'). Only basic arithmetic operations and numbers are permitted."
      }
    },
    required: ["expression"]
  };

  public async execute(args: { expression: string }): Promise<string> {
    if (!args.expression) {
      throw new Error("Parameter 'expression' is required");
    }
    
    const expression = args.expression.trim();
    
    // Strict security validation to prevent arbitrary JS code execution.
    // Allows digits, spaces, decimals, and operators: +, -, *, /, %, (, )
    const mathRegex = /^[0-9+\-*/().\s%]+$/;
    if (!mathRegex.test(expression)) {
      throw new Error("Invalid characters in math expression. Only digits, spaces, and basic operators (+, -, *, /, %, parentheses) are allowed.");
    }

    try {
      // Safe evaluation after strict verification
      const fn = new Function(`return (${expression});`);
      const result = fn();
      if (result === undefined || result === null || typeof result !== "number") {
        throw new Error("Expression did not evaluate to a valid number");
      }
      if (!isFinite(result)) {
        throw new Error("Expression resulted in an infinite value or division by zero");
      }
      return String(result);
    } catch (err: any) {
      throw new Error(`Failed to evaluate expression: ${err.message}`);
    }
  }
}
