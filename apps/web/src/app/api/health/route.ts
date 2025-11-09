import { NextResponse } from 'next/server';

/**
 * Health check endpoint for the Next.js (web) application.
 *
 * This route is used by services like Docker to confirm that the
 * web container is running and responsive.
 *
 * It is separate from the API server's health check .
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Web application is healthy',
    timestamp: new Date().toISOString(),
    // This variable is set by Next.js at build time
    nodeEnv: process.env.NODE_ENV,
  });
}
