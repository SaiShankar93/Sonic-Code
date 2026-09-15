# Claude Code Clone

A Bun-powered coding agent that uses an OpenAI-compatible API to inspect a
repository, edit files, and run shell commands through a multi-step tool loop.

## Requirements

- Bun 1.3+
- An OpenRouter API key, or another OpenAI-compatible provider

## Setup

```sh
bun install
cp .env.example .env
```

Set `OPENROUTER_API_KEY` in `.env`. Keep `.env` local; it is ignored by Git.

On Windows PowerShell, copy the template with:

```powershell
Copy-Item .env.example .env
```

## Run

Run the agent from the repository it should work in:

```sh
bun run app/main.ts -p "Inspect this project, fix any issues, and summarize your changes."
```

The agent advertises and executes three tools:

- `Read`: inspect a file.
- `Write`: create or overwrite a file.
- `Bash`: run a shell command and return stdout and stderr.

Tool output is kept in the conversation. Only the final assistant response is
written to stdout; fatal errors are written to stderr.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | required | Provider authentication |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | API endpoint |
| `OPENROUTER_MODEL` | `cohere/north-mini-code:free` | Model used for requests |
| `CLAUDE_MAX_ITERATIONS` | `25` | Maximum agent turns |
| `OPENROUTER_TIMEOUT_MS` | `120000` | API request timeout |

Change the model in `.env` when needed:

```env
OPENROUTER_MODEL=cohere/north-mini-code:free
```

## Development

```sh
bun run typecheck
```

The application is intentionally a single small entry point. The next safe
extension points are approval prompts for writes and shell commands, an `Edit`
tool for targeted changes, repository search tools, and streaming responses.
