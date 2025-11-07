import type { CallCredentials, ChannelCredentials } from '@grpc/grpc-js';
import { credentials, Metadata } from '@grpc/grpc-js';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Initializes the OpenTelemetry SDK for Node.js.
 */
export function initOpenTelemetry(serviceName: string) {
  const collectorUrl = process.env.OTEL_COLLECTOR_URL;
  if (!collectorUrl) {
    console.log('[Tracing] OTEL_COLLECTOR_URL not set. Tracing is disabled.');
    return;
  }
  if (!serviceName) {
    console.error('[Tracing] Service name is required to initialize tracing. Tracing is disabled.');
    return;
  }

  try {
    // --- 1. Create gRPC Credentials ---
    let channelCreds: ChannelCredentials = credentials.createSsl();
    const authHeader = process.env.OTEL_COLLECTOR_AUTH_HEADER;

    if (authHeader) {
      // 'Metadata' is used as a value here, so it must be a regular import
      const metadata = new Metadata();
      metadata.set('authorization', authHeader);

      const callCreds: CallCredentials = credentials.createFromMetadataGenerator(
        (_params: unknown, callback: (error: Error | null, metadata?: Metadata) => void) => {
          callback(null, metadata);
        }
      );

      // Correctly combine channel and call credentials
      channelCreds = credentials.combineChannelCredentials(channelCreds, callCreds);
    }

    // --- 2. Create the Exporter ---
    const traceExporter = new OTLPTraceExporter({
      url: collectorUrl,
      credentials: channelCreds,
    });

    // --- 3. Define the Resource ---
    // Use raw strings to avoid all deprecation/import issues
    const resource = new Resource({
      'service.name': serviceName,
      'deployment.environment.name': process.env.NODE_ENV || 'development',
    });

    // --- 4. Initialize the NodeSDK ---
    const sdk = new NodeSDK({
      resource: resource,
      traceExporter: traceExporter,
      instrumentations: [getNodeAutoInstrumentations()],
    });

    // --- 5. Start the SDK ---
    sdk.start();

    console.log(`[Tracing] OpenTelemetry initialized for service: ${serviceName}`);
    console.log(`[Tracing] Collector URL: ${collectorUrl}`);

    // --- 6. Add a Shutdown Hook ---
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('[Tracing] SDK shut down successfully'))
        .catch((error) => console.error('[Tracing] Error shutting down SDK', error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.error('[Tracing] Failed to initialize OpenTelemetry SDK', error);
  }
}
