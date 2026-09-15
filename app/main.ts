import OpenAI from "openai";
import { readFile } from "node:fs/promises";

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

  const response = await client.chat.completions.create({
    model: "anthropic/claude-haiku-4.5",
    messages: [{ role: "user", content: prompt }],
    tools: [
      {
        type: "function",
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
      }
    ]
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("no choices in response");
  }

  const toolCall = response.choices[0].message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function" || toolCall.function.name !== "Read") {
    throw new Error("expected a Read tool call");
  }

  const argumentsObject = JSON.parse(toolCall.function.arguments) as {
    file_path?: unknown;
  };
  if (typeof argumentsObject.file_path !== "string") {
    throw new Error("Read tool call must include a file_path");
  }

  const contents = await readFile(argumentsObject.file_path, "utf8");
  process.stdout.write(contents);

}

main();
