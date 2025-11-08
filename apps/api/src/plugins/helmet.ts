import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * This plugin registers @fastify/helmet to set crucial security headers.
 * This enhanced version provides a much stricter Content-Security-Policy (CSP)
 * tailored for a JSON API, mitigating XSS, clickjacking, and other attacks.
 *
 * @fastify/helmet sets 14 other security headers by default (like HSTS,
 * X-Content-Type-Options, etc.), which is excellent. Our main job here
 * is to configure a robust CSP.
 *
 * @see https://github.com/fastify/fastify-helmet
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(helmet, {
    // Enable and configure a strict Content-Security-Policy
    contentSecurityPolicy: {
      directives: {
        // --- Base Policy ---
        // Restrict everything to our own origin by default.
        // An API shouldn't need to load resources from other places.
        defaultSrc: ["'self'"],

        // --- Critical Security Directives ---

        // Block all plugins (Flash, Silverlight, etc.). This is a major
        // defense against XSS vulnerabilities.
        objectSrc: ["'none'"],

        // Block all framing (iframes, <frame>, <embed>).
        // This is your single most important defense against CLICKJACKING.
        frameAncestors: ["'none'"],

        // --- Specific Overrides ---

        // An API server's primary job is to serve data. It should
        // *not* be serving scripts or styles.
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],

        // Allow connections (fetch, tRPC, WebSockets) only to our own origin.
        connectSrc: ["'self'"],

        // Allow images from our origin or data: URIs (e.g., inlined)
        // We'll restrict it to 'self' and 'data:'.)
        imgSrc: ["'self'", 'data:'],

        // Restrict fonts, media, and form submissions to our origin.
        fontSrc: ["'self'"],
        mediaSrc: ["'self'"],
        formAction: ["'self'"],

        // Disallow <base> tags that could be used to change relative URLs.
        baseUri: ["'self'"],
      },
    },
  });
});
