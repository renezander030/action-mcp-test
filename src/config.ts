import * as fs from 'fs';
import { TestConfig } from './types';

export async function parseConfig(configPath: string): Promise<TestConfig> {
  const defaultConfig: TestConfig = { fixtures: [] };

  if (!configPath || !fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    // Simple YAML-like parsing for mcp-test.yml
    // Supports: fixtures array with tool, args, expect
    const parsed = parseSimpleYaml(content);
    return { ...defaultConfig, ...parsed };
  } catch {
    return defaultConfig;
  }
}

function parseSimpleYaml(content: string): Partial<TestConfig> {
  // For v1: use JSON config format, YAML support in v2
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}
