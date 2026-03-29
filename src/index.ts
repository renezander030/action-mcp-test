import * as core from '@actions/core';
import { runTests } from './runner';
import { parseConfig } from './config';
import { formatSummary } from './report';

async function main(): Promise<void> {
  try {
    const command = core.getInput('command');
    const url = core.getInput('url');
    const configPath = core.getInput('config');
    const timeout = parseInt(core.getInput('timeout') || '30', 10);
    const skip = core.getInput('skip').split(',').map(s => s.trim()).filter(Boolean);

    if (!command && !url) {
      throw new Error('Either "command" (stdio) or "url" (HTTP) input is required');
    }

    const config = await parseConfig(configPath);
    const transport = command ? { type: 'stdio' as const, command } : { type: 'http' as const, url: url! };

    core.info(`Testing MCP server via ${transport.type} transport`);

    const results = await runTests(transport, config, { timeout, skip });

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    core.setOutput('passed', passed.toString());
    core.setOutput('failed', failed.toString());
    core.setOutput('score', score.toString());

    const reportPath = '/tmp/mcp-test-report.json';
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    core.setOutput('report', reportPath);

    await formatSummary(results, score);

    if (failed > 0) {
      core.setFailed(`${failed}/${total} tests failed (score: ${score}%)`);
    } else {
      core.info(`All ${total} tests passed (score: ${score}%)`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

main();
