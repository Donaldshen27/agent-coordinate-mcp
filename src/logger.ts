// Logger utility that handles logging differently for MCP vs standalone mode
// In MCP mode, logs go to stderr to avoid corrupting stdio communication
// In standalone mode, logs go to stdout as normal

class Logger {
  private isMCPMode: boolean;

  constructor() {
    // MCP mode is when we're not explicitly running with --no-mcp flag
    this.isMCPMode = !process.argv.includes('--no-mcp');
  }

  log(...args: any[]): void {
    if (this.isMCPMode) {
      // In MCP mode, write to stderr to avoid corrupting stdio
      console.error('[LOG]', ...args);
    } else {
      // In standalone mode, use normal console.log
      console.log(...args);
    }
  }

  error(...args: any[]): void {
    // Errors always go to stderr
    console.error('[ERROR]', ...args);
  }

  debug(...args: any[]): void {
    if (this.isMCPMode) {
      // In MCP mode, debug logs go to stderr
      console.error('[DEBUG]', ...args);
    } else {
      // In standalone mode, use normal console.log
      console.log('[DEBUG]', ...args);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();