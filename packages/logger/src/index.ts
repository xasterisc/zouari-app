import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Centralized logger instance using Pino
 * - Pretty printing in development
 * - JSON output in production for log aggregation
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // Only use pino-pretty transport in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z', // More concise time format
          ignore: 'pid,hostname', // Exclude less useful fields in dev
        },
      }
    : undefined, // Use default JSON output in production
  formatters: {
    // Ensure level is output as a string label (e.g., "info") not a number
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime, // Use ISO 8601 format
});

/**
 * Create a child logger with additional context (e.g., service name, request ID)
 * @param context - Key-value pairs to add to every log message from this child
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

// Optionally add a startup log message
logger.info('Logger initialized');
