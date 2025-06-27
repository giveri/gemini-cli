## Authentication Setup

Gemini CLI uses a local Ollama API and does not require any credentials. Start the Ollama server locally (by default it listens on `http://localhost:11434`).

To customize the connection, create a `.ollama-config` file with entries such as:

```bash
AI_CHAT_BASE_URL=http://172.16.0.1:11434/v1
AI_CHAT_MODEL=gemma3n:e4b
AI_CHAT_KEY=dummy
AI_CHAT_NAME=Gemma-3n
```

These variables are loaded when you choose the **Ollama** authentication option. You can also use `OLLAMA_BASE_URL` to override the default host.
