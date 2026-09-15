[![progress-banner](https://backend.codecrafters.io/progress/claude-code/f7e0d46a-84f5-42f7-b112-edb8d770557b)](https://app.codecrafters.io/users/SaiShankar93?r=2qF)

This is a starting point for TypeScript solutions to the
["Build Your own Claude Code" Challenge](https://codecrafters.io/challenges/claude-code).

Claude Code is an AI coding assistant that uses Large Language Models (LLMs) to
understand code and perform actions through tool calls. In this challenge,
you'll build your own Claude Code from scratch by implementing an LLM-powered
coding assistant.

Along the way you'll learn about HTTP RESTful APIs, OpenAI-compatible tool
calling, agent loop, and how to integrate multiple tools into an AI assistant.

**Note**: If you're viewing this repo on GitHub, head over to
[codecrafters.io](https://codecrafters.io) to try the challenge.

# Passing the first stage

The entry point for your `claude-code` implementation is in `app/main.ts`. Study
and uncomment the relevant code, and submit to pass the first stage:

```sh
codecrafters submit
```

# Stage 2 & beyond

Note: This section is for stages 2 and beyond.

1. Ensure you have `bun (1.3)` installed locally.
2. Run `./your_program.sh` to run your program, which is implemented in
   `app/main.ts`.
3. Run `codecrafters submit` to submit your solution to CodeCrafters. Test
   output will be streamed to your terminal.

# Running the Agent Locally

This implementation supports a multi-step coding-agent loop with these tools:

- `Read`: inspect a file.
- `Write`: create or overwrite a file.
- `Bash`: run a shell command and return its output.

Install dependencies and configure an OpenRouter key:

```sh
npm install
export OPENROUTER_API_KEY="your-key"
```

On Windows PowerShell, use `$env:OPENROUTER_API_KEY = "your-key"` instead.
Then run a request from the repository you want the agent to modify:

```sh
./your_program.sh -p "Inspect the project, fix the failing tests, and summarize the changes."
```

The default model is the free
`cohere/north-mini-code:free`. You can change it with
`OPENROUTER_MODEL`, change the endpoint with `OPENROUTER_BASE_URL`, and set the
maximum number of agent turns with `CLAUDE_MAX_ITERATIONS` (default: 25). Tool
output stays internal; only the final assistant response is written to stdout.

Validate the code without making an API request:

```sh
npm run typecheck
```

# Next Steps

To keep developing this into a fuller Claude Code clone:

1. Extract the tool dispatcher into `app/tools.ts` and add unit tests.
2. Add an `Edit` tool for targeted replacements and `Glob`/`Grep` tools for search.
3. Add an interactive mode for multiple prompts in one process.
4. Add approval prompts before writes and destructive shell commands.
5. Add streaming model responses for a more responsive terminal experience.
