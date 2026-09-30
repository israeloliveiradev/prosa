import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export function registerSecurityHeaders(app: FastifyInstance, publicUrl?: string): void {
  const enforceHttps = Boolean(publicUrl && publicUrl.startsWith("https://"));
  app.addHook("onSend", async (_request: FastifyRequest, reply: FastifyReply, payload) => {
    if (enforceHttps) {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-DNS-Prefetch-Control", "off");
    reply.header("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("X-Permitted-Cross-Domain-Policies", "none");
    const contentType = String(reply.getHeader("content-type") ?? "");
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }
    if (!contentType.includes("audio/")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });
}
