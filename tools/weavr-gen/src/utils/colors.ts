export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

let useColors = true;

/**
 * Configure whether to use ANSI colors (e.g. disable for JSON output)
 */
export function setUseColors(enabled: boolean): void {
  useColors = enabled;
}

export function green(text: string): string {
  return useColors ? `${colors.green}${text}${colors.reset}` : text;
}

export function red(text: string): string {
  return useColors ? `${colors.red}${text}${colors.reset}` : text;
}

export function yellow(text: string): string {
  return useColors ? `${colors.yellow}${text}${colors.reset}` : text;
}

export function bold(text: string): string {
  return useColors ? `${colors.bold}${text}${colors.reset}` : text;
}

export function formatSeverity(severity: string): string {
  switch (severity) {
    case 'error': return red('❌ ERROR:');
    case 'warning': return yellow('⚠️ WARN:');
    default: return 'ℹ️ INFO:';
  }
}
