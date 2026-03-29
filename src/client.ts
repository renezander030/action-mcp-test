import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from './types';

export async function createClient(transport: Transport, timeout: number): Promise<Client> {
  const client = new Client({
    name: 'action-mcp-test',
    version: '0.1.0',
  });

  if (transport.type === 'stdio' && transport.command) {
    const parts = transport.command.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    const stdioTransport = new StdioClientTransport({ command: cmd, args });
    await client.connect(stdioTransport);
  } else if (transport.type === 'http' && transport.url) {
    const httpTransport = new StreamableHTTPClientTransport(new URL(transport.url));
    await client.connect(httpTransport);
  } else {
    throw new Error(`Invalid transport config: ${JSON.stringify(transport)}`);
  }

  return client;
}
