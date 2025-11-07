import { afterAll, describe, expect, it } from 'vitest';
import { createLogger, logger } from './index.js';

describe('Logger Package', () => {
  // Silence the logger during tests to keep the test output clean
  // We restore the original level after tests run
  const originalLevel = logger.level;
  logger.level = 'silent';

  afterAll(() => {
    // Restore original level
    logger.level = originalLevel;
  });

  it('should initialize the main logger instance', () => {
    // A simple "smoke test" to ensure the logger exists
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should create a child logger with correct context', () => {
    const context = {
      service: 'test-service',
      requestId: 'xyz-123',
    };
    const childLogger = createLogger(context);

    // Verify the child logger exists
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');

    // **This is the main test:**
    // We check the logger's "bindings" (its internal context)
    // to ensure our context was applied correctly.
    const bindings = childLogger.bindings();
    expect(bindings).toEqual(expect.objectContaining(context));
  });

  it('should not share context between child loggers', () => {
    const child1 = createLogger({ service: 'service-one' });
    const child2 = createLogger({ service: 'service-two' });

    expect(child1.bindings()).toEqual(expect.objectContaining({ service: 'service-one' }));
    expect(child2.bindings()).toEqual(expect.objectContaining({ service: 'service-two' }));

    // Ensure they don't have each other's properties
    expect(child1.bindings()).not.toHaveProperty('service-two');
    expect(child2.bindings()).not.toHaveProperty('service-one');
  });
});
