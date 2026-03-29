export interface Transport {
  type: 'stdio' | 'http';
  command?: string;
  url?: string;
}

export interface TestResult {
  category: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface TestOptions {
  timeout: number;
  skip: string[];
}

export interface ToolFixture {
  tool: string;
  args: Record<string, unknown>;
  expect?: {
    success?: boolean;
    outputContains?: string;
  };
}

export interface TestConfig {
  fixtures: ToolFixture[];
}
