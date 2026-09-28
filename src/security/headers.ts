import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook("onSend", async (_request: FastifyRequest, reply: FastifyReply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-DNS-Prefetch-Control", "off");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    const contentType = String(reply.getHeader("content-type") ?? "");
    if (!contentType.includes("audio/")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });
}
