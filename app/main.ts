import OpenAI from "openai";
import { exec } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const DEFAULT_MODEL = "cohere/north-mini-code:free";
const DEFAULT_MAX_ITERATIONS = 25;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

type ToolArguments = {
  file_path?: unknown;
  content?: unknown;
  command?: unknown;
};

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
  },
  {
    type: "function",
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
  },
  {
    type: "function",
    function: {
      name: "Bash",
      description: "Execute a shell command",
      parameters: {
        type: "object",
        required: ["command"],
        properties: {
          command: {
            type: "string",
            description: "The command to execute"
          }
        }
      }
    }
  }
];

const systemPrompt = `You are a practical coding assistant running in a local repository.
Use the available tools to inspect files, make requested changes, and run relevant checks.
Work from the current working directory. Be precise and concise in your final response.`;

function parseArguments(rawArguments: string): ToolArguments {
  try {
    const parsed: unknown = JSON.parse(rawArguments);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("tool arguments must be a JSON object");
    }
    return parsed as ToolArguments;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`invalid tool arguments: ${message}`);
  }
}

async function executeTool(
  toolName: string,
  rawArguments: string,
  workingDirectory: string
): Promise<string> {
  const argumentsObject = parseArguments(rawArguments);

  if (toolName === "Read") {
    if (typeof argumentsObject.file_path !== "string") {
      throw new Error("Read requires a string file_path");
    }
    return readFile(argumentsObject.file_path, "utf8");
  }

  if (toolName === "Write") {
    if (
      typeof argumentsObject.file_path !== "string" ||
      typeof argumentsObject.content !== "string"
    ) {
      throw new Error("Write requires string file_path and content");
    }
    await writeFile(argumentsObject.file_path, argumentsObject.content, "utf8");
    return "File written successfully";
  }

  if (toolName === "Bash") {
    if (typeof argumentsObject.command !== "string") {
      throw new Error("Bash requires a string command");
    }

    try {
      const result = await execAsync(argumentsObject.command, {
        cwd: workingDirectory,
        maxBuffer: 10 * 1024 * 1024
      });
      return result.stdout + result.stderr;
    } catch (error) {
      const commandError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      return (
        (commandError.stdout ?? "") +
        (commandError.stderr ?? "") +
        (commandError.message ?? "Command failed")
      );
    }
  }

  throw new Error(`unsupported tool: ${toolName}`);
}

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const workingDirectory = process.cwd();
  const maxIterations = Number(
    process.env.CLAUDE_MAX_ITERATIONS ?? DEFAULT_MAX_ITERATIONS
  );
  const requestTimeout = Number(
    process.env.OPENROUTER_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS
  );

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to your environment.");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("usage: bun run app/main.ts -p \"your request\"");
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new Error("CLAUDE_MAX_ITERATIONS must be a positive integer");
  }
  if (!Number.isInteger(requestTimeout) || requestTimeout < 1) {
    throw new Error("OPENROUTER_TIMEOUT_MS must be a positive integer");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    timeout: requestTimeout
  });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Working directory: ${workingDirectory}\n\n${prompt}`
    }
  ];

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const response = await client.chat.completions.create({
      model,
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
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Unsupported non-function tool call"
        });
        continue;
      }

      let result: string;
      try {
        result = await executeTool(
          toolCall.function.name,
          toolCall.function.arguments,
          workingDirectory
        );
      } catch (error) {
        result = error instanceof Error ? `Error: ${error.message}` : "Error: tool failed";
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result
      });
    }
  }

  throw new Error(`agent stopped after ${maxIterations} iterations without a final response`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
