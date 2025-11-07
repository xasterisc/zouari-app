import pino, { type TransportTargetOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const transports: TransportTargetOptions[] = [];

// 1. Add Pretty Print transport in development
if (isDevelopment) {
  transports.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  });
}

// 2. Add OpenTelemetry transport
// This will activate if the environment variable is set.
if (process.env.OTEL_COLLECTOR_URL) {
  transports.push({
    target: 'pino-opentelemetry-transport', // <-- USE THE CORRECT TARGET
    options: {
      url: process.env.OTEL_COLLECTOR_URL,
      serviceName: process.env.OTEL_SERVICE_NAME || 'zouari-app',
      resourceAttributes: {
        'service.name': process.env.OTEL_SERVICE_NAME || 'zouari-app',
        'deployment.environment': process.env.NODE_ENV || 'development',
      },
      // This includes the auth header we set up in the tracing package
      ...(process.env.OTEL_COLLECTOR_AUTH_HEADER && {
        headers: {
          authorization: process.env.OTEL_COLLECTOR_AUTH_HEADER,
        },
      }),
    },
  });
}

/**
 * Centralized logger instance using Pino
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: {
    targets: transports,
  },
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

logger.info('Logger initialized');
