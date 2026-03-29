# action-mcp-test

GitHub Action to test MCP (Model Context Protocol) servers in CI. Protocol compliance, schema validation, and tool smoke-testing in a single step.

![MCP Compliance](https://img.shields.io/badge/MCP_Compliance-100%25-brightgreen)

## Usage

```yaml
- uses: renezander030/action-mcp-test@v1
  with:
    command: 'node dist/server.js'  # stdio transport
```

```yaml
- uses: renezander030/action-mcp-test@v1
  with:
    url: 'http://localhost:3000/mcp'  # Streamable HTTP transport
```

## What it tests

| Category | Tests | Description |
|----------|-------|-------------|
| **Lifecycle** | `server_connect`, `server_info`, `ping` | Connection, handshake, server metadata |
| **Tools** | `list_tools`, `schema_validation`, `unknown_tool_error` | Tool discovery, JSON Schema validation, error handling |
| **Resources** | `list_resources` | Resource enumeration and structure |
| **Prompts** | `list_prompts` | Prompt enumeration and structure |

## Tool smoke-testing

Create `mcp-test.json` in your repo root:

```json
{
  "fixtures": [
    {
      "tool": "get_weather",
      "args": { "city": "Berlin" },
      "expect": {
        "success": true,
        "outputContains": "temperature"
      }
    }
  ]
}
```

```yaml
- uses: renezander030/action-mcp-test@v1
  with:
    command: 'node dist/server.js'
    config: 'mcp-test.json'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `command` | One of command/url | - | Start command for stdio transport |
| `url` | One of command/url | - | URL for Streamable HTTP transport |
| `config` | No | `mcp-test.yml` | Path to test fixtures config |
| `timeout` | No | `30` | Timeout in seconds |
| `skip` | No | - | Categories to skip: `lifecycle,tools,resources,prompts` |

## Outputs

| Output | Description |
|--------|-------------|
| `passed` | Number of tests passed |
| `failed` | Number of tests failed |
| `score` | Compliance score (0-100) |
| `report` | Path to JSON test report |

## Job Summary

The action writes a formatted test report to the GitHub Job Summary with pass/fail table and compliance badge.

## License

MIT
