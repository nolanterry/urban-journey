/**
 * Safe logging utility
 * 
 * Automatically redacts sensitive fields like tokens, secrets, and keys
 * from log messages to prevent accidental exposure.
 */

const SENSITIVE_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /key/i,
  /credential/i,
  /authorization/i,
  /bearer\s+\w+/i,
  /sk_[a-zA-Z0-9]+/,
  /pk_[a-zA-Z0-9]+/,
  /[a-zA-Z0-9_-]{20,}/, // Long strings that might be tokens
];

/**
 * Redact sensitive information from a message
 */
function redactSensitive(message: string): string {
  let redacted = message;

  // Redact common token patterns
  redacted = redacted.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]');
  redacted = redacted.replace(/token["\s:=]+([^\s"']+)/gi, 'token [REDACTED]');
  redacted = redacted.replace(/secret["\s:=]+([^\s"']+)/gi, 'secret [REDACTED]');
  redacted = redacted.replace(/password["\s:=]+([^\s"']+)/gi, 'password [REDACTED]');
  redacted = redacted.replace(/key["\s:=]+([^\s"']+)/gi, 'key [REDACTED]');

  // Redact long alphanumeric strings that look like tokens (20+ chars)
  redacted = redacted.replace(/\b[a-zA-Z0-9_-]{32,}\b/g, '[REDACTED]');

  return redacted;
}

/**
 * Safe logger that redacts sensitive information
 */
export const logger = {
  /**
   * Log info message (redacts sensitive data)
   */
  info: (message: string, ...args: unknown[]) => {
    const redactedMessage = redactSensitive(message);
    const redactedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        return redactSensitive(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(redactSensitive(JSON.stringify(arg)));
        } catch {
          return '[Object]';
        }
      }
      return arg;
    });
    console.log(redactedMessage, ...redactedArgs);
  },

  /**
   * Log error message (redacts sensitive data)
   */
  error: (message: string, error?: unknown) => {
    const redactedMessage = redactSensitive(message);
    
    if (error instanceof Error) {
      const redactedError = new Error(redactSensitive(error.message));
      redactedError.stack = error.stack;
      redactedError.name = error.name;
      console.error(redactedMessage, redactedError);
    } else if (error) {
      const errorStr = String(error);
      console.error(redactedMessage, redactSensitive(errorStr));
    } else {
      console.error(redactedMessage);
    }
  },

  /**
   * Log warning message (redacts sensitive data)
   */
  warn: (message: string, ...args: unknown[]) => {
    const redactedMessage = redactSensitive(message);
    const redactedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        return redactSensitive(arg);
      }
      return arg;
    });
    console.warn(redactedMessage, ...redactedArgs);
  },
};
