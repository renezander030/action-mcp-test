import * as core from '@actions/core';
import { TestResult } from './types';

export async function formatSummary(results: TestResult[], score: number): Promise<void> {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  const statusIcon = failed === 0 ? ':white_check_mark:' : ':x:';
  const scoreColor = score >= 80 ? 'brightgreen' : score >= 50 ? 'yellow' : 'red';

  let summary = `## ${statusIcon} MCP Server Test Results\n\n`;
  summary += `**Score: ${score}%** | ${passed} passed | ${failed} failed | ${skipped} skipped\n\n`;
  summary += `![MCP Compliance](https://img.shields.io/badge/MCP_Compliance-${score}%25-${scoreColor})\n\n`;

  // Group by category
  const categories = new Map<string, TestResult[]>();
  for (const result of results) {
    const cat = categories.get(result.category) || [];
    cat.push(result);
    categories.set(result.category, cat);
  }

  summary += '| Category | Test | Status | Duration |\n';
  summary += '|----------|------|--------|----------|\n';

  for (const [category, tests] of categories) {
    for (const test of tests) {
      const icon = test.status === 'passed' ? ':white_check_mark:' : test.status === 'failed' ? ':x:' : ':fast_forward:';
      const error = test.error ? ` - ${test.error.substring(0, 80)}` : '';
      summary += `| ${category} | ${test.name} | ${icon} ${test.status}${error} | ${test.duration}ms |\n`;
    }
  }

  await core.summary.addRaw(summary).write();
}
