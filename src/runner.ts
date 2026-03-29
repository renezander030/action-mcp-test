import * as core from '@actions/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport, TestResult, TestOptions, TestConfig } from './types';
import { createClient } from './client';

export async function runTests(
  transport: Transport,
  config: TestConfig,
  options: TestOptions,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let client: Client | undefined;

  try {
    // Lifecycle: connect
    const connectResult = await runTest('lifecycle', 'server_connect', async () => {
      client = await createClient(transport, options.timeout);
    });
    results.push(connectResult);

    if (!client || connectResult.status === 'failed') {
      return results;
    }

    // Lifecycle: server info
    if (!options.skip.includes('lifecycle')) {
      results.push(await runTest('lifecycle', 'server_info', async () => {
        const info = client!.getServerVersion();
        if (!info) throw new Error('Server did not return serverInfo');
        if (!info.name) throw new Error('serverInfo.name is missing');
        core.info(`Server: ${info.name} v${info.version || 'unknown'}`);
      }));

      results.push(await runTest('lifecycle', 'ping', async () => {
        await client!.ping();
      }));
    }

    // Tools
    if (!options.skip.includes('tools')) {
      results.push(...await testTools(client, config, options));
    }

    // Resources
    if (!options.skip.includes('resources')) {
      results.push(...await testResources(client));
    }

    // Prompts
    if (!options.skip.includes('prompts')) {
      results.push(...await testPrompts(client));
    }

  } finally {
    if (client) {
      try { await client.close(); } catch { /* ignore cleanup errors */ }
    }
  }

  return results;
}

async function testTools(client: Client, config: TestConfig, options: TestOptions): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // List tools
  results.push(await runTest('tools', 'list_tools', async () => {
    const response = await client.listTools();
    if (!response.tools) throw new Error('tools/list did not return tools array');
    core.info(`Found ${response.tools.length} tool(s)`);

    // Validate each tool has required fields
    for (const tool of response.tools) {
      if (!tool.name) throw new Error('Tool missing "name" field');
      if (!tool.description) throw new Error(`Tool "${tool.name}" missing "description" field`);
      if (!tool.inputSchema) throw new Error(`Tool "${tool.name}" missing "inputSchema" field`);
      if (tool.inputSchema.type !== 'object') {
        throw new Error(`Tool "${tool.name}" inputSchema.type must be "object", got "${tool.inputSchema.type}"`);
      }
    }
  }));

  // Schema validation
  results.push(await runTest('tools', 'schema_validation', async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      const schema = tool.inputSchema;
      if (schema.properties && typeof schema.properties !== 'object') {
        throw new Error(`Tool "${tool.name}" has invalid properties in inputSchema`);
      }
      if (schema.required && !Array.isArray(schema.required)) {
        throw new Error(`Tool "${tool.name}" has non-array "required" in inputSchema`);
      }
    }
  }));

  // Unknown tool error
  results.push(await runTest('tools', 'unknown_tool_error', async () => {
    try {
      await client.callTool({ name: '__nonexistent_tool_xyz__', arguments: {} });
      throw new Error('Server should reject unknown tool names');
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message === 'Server should reject unknown tool names') throw err;
      // Expected: server returned an error
    }
  }));

  // Fixture-based smoke tests
  for (const fixture of config.fixtures) {
    results.push(await runTest('tools', `smoke_${fixture.tool}`, async () => {
      const result = await client.callTool({
        name: fixture.tool,
        arguments: fixture.args,
      });

      if (fixture.expect?.success !== undefined) {
        const isError = result.isError === true;
        if (fixture.expect.success && isError) {
          throw new Error(`Expected success but tool returned error`);
        }
        if (!fixture.expect.success && !isError) {
          throw new Error(`Expected error but tool succeeded`);
        }
      }

      if (fixture.expect?.outputContains) {
        const output = JSON.stringify(result.content);
        if (!output.includes(fixture.expect.outputContains)) {
          throw new Error(`Output does not contain "${fixture.expect.outputContains}"`);
        }
      }
    }));
  }

  return results;
}

async function testResources(client: Client): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(await runTest('resources', 'list_resources', async () => {
    try {
      const response = await client.listResources();
      if (response.resources) {
        core.info(`Found ${response.resources.length} resource(s)`);
        for (const resource of response.resources) {
          if (!resource.uri) throw new Error('Resource missing "uri" field');
          if (!resource.name) throw new Error(`Resource "${resource.uri}" missing "name" field`);
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      // Method not found is acceptable (server doesn't support resources)
      if (err.message?.includes('-32601') || err.message?.includes('not found') || err.message?.includes('not supported')) {
        core.info('Server does not support resources (OK)');
        return;
      }
      throw err;
    }
  }));

  return results;
}

async function testPrompts(client: Client): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(await runTest('prompts', 'list_prompts', async () => {
    try {
      const response = await client.listPrompts();
      if (response.prompts) {
        core.info(`Found ${response.prompts.length} prompt(s)`);
        for (const prompt of response.prompts) {
          if (!prompt.name) throw new Error('Prompt missing "name" field');
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message?.includes('-32601') || err.message?.includes('not found') || err.message?.includes('not supported')) {
        core.info('Server does not support prompts (OK)');
        return;
      }
      throw err;
    }
  }));

  return results;
}

async function runTest(category: string, name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { category, name, status: 'passed', duration: Date.now() - start };
  } catch (e: unknown) {
    const err = e as Error;
    core.warning(`[${category}/${name}] ${err.message}`);
    return { category, name, status: 'failed', duration: Date.now() - start, error: err.message };
  }
}
