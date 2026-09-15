import OpenAI from "openai";
import { readFile, writeFile } from "node:fs/promises";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL
  });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: prompt }
  ];
  const tools = [
    {
      type: "function" as const,
      function: {
        name: "Read",
        description: "Read and return the contents of a file",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "The path to the file to read"
            }
          },
          required: ["file_path"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "Write",
        description: "Write content to a file",
        parameters: {
          type: "object",
          required: ["file_path", "content"],
          properties: {
            file_path: {
              type: "string",
              description: "The path of the file to write to"
            },
            content: {
              type: "string",
              description: "The content to write to the file"
            }
          }
        }
      }
    }
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages,
      tools
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      process.stdout.write(assistantMessage.content ?? "");
      return;
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") {
        throw new Error("expected a function tool call");
      }

      const argumentsObject = JSON.parse(toolCall.function.arguments) as {
        file_path?: unknown;
        content?: unknown;
      };

      if (toolCall.function.name === "Read") {
        if (typeof argumentsObject.file_path !== "string") {
          throw new Error("Read tool call must include a file_path");
        }

        const contents = await readFile(argumentsObject.file_path, "utf8");
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: contents
        });
      } else if (toolCall.function.name === "Write") {
        if (
          typeof argumentsObject.file_path !== "string" ||
          typeof argumentsObject.content !== "string"
        ) {
          throw new Error("Write tool call must include a file_path and content");
        }

        await writeFile(argumentsObject.file_path, argumentsObject.content, "utf8");
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "File written successfully"
        });
      } else {
        throw new Error(`unsupported tool: ${toolCall.function.name}`);
      }
    }
  }
}

main();
