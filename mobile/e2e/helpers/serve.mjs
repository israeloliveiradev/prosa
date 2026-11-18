#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchRoute, mockUsers } from "../mocks/routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

// Parse CLI args
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const distDirArg = getArg("--dist", "dist-e2e");
const port = parseInt(getArg("--port", "4173"), 10);
const apiMode = getArg("--api", "none"); // none | mock
const seedPersona = getArg("--seed", "none"); // none | learner | pro | admin | new
const dataset = getArg("--dataset", "demo");
const host = getArg("--host", "127.0.0.1");

const distPath = path.isAbsolute(distDirArg) ? distDirArg : path.join(mobileRoot, distDirArg);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
};

function generateSeedScript(persona) {
  if (!persona || persona === "none" || persona === "new") {
    return `<script>
      try {
        localStorage.removeItem("prosa\\\\prosa.session.v1");
        localStorage.removeItem("prosa\\\\prosa.journey.v1");
      } catch (e) {}
    </script>`;
  }

  const user = mockUsers[persona] || mockUsers.learner;
  const session = JSON.stringify({ token: `mock-token-${persona}`, user });
  const journey = JSON.stringify({ userId: user.id, done: true, step: "ready" });
  const guide = JSON.stringify({ seen: ["daily", "memory", "news", "practice"] });
  const theme = JSON.stringify("system");

  return `<script>
    try {
      localStorage.setItem("prosa\\\\prosa.session.v1", ${JSON.stringify(session)});
      localStorage.setItem("prosa\\\\prosa.journey.v1", ${JSON.stringify(journey)});
      localStorage.setItem("prosa\\\\prosa.guide.v1", ${JSON.stringify(guide)});
      localStorage.setItem("prosa\\\\prosa.theme.v2", ${JSON.stringify(theme)});
    } catch (e) {
      console.error("Failed to seed localStorage in E2E", e);
    }
  </script>`;
}

function resolveFilePath(urlPath) {
  const cleanPath = urlPath.split("?")[0].split("#")[0];
  const decoded = decodeURIComponent(cleanPath);

  // 1. Arquivo exato
  let target = path.join(distPath, decoded);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return { filePath: target, status: 200 };
  }

  // 2. <caminho>.html
  if (fs.existsSync(target + ".html") && fs.statSync(target + ".html").isFile()) {
    return { filePath: target + ".html", status: 200 };
  }

  // 3. <caminho>/index.html
  const indexPath = path.join(target, "index.html");
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return { filePath: indexPath, status: 200 };
  }

  // 4. Rota dinâmica de segmento (ex.: /cert/xyz -> /cert/[token].html)
  const segments = decoded.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const parentDir = path.join(distPath, ...segments.slice(0, -1));
    if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
      const files = fs.readdirSync(parentDir);
      const dynamicFile = files.find((f) => f.startsWith("[") && f.endsWith("].html"));
      if (dynamicFile) {
        return { filePath: path.join(parentDir, dynamicFile), status: 200 };
      }
    }
  }

  // 5. Fallback para 404 ou SPA
  const notFoundPath = path.join(distPath, "+not-found.html");
  if (fs.existsSync(notFoundPath) && fs.statSync(notFoundPath).isFile()) {
    return { filePath: notFoundPath, status: 404 };
  }

  const rootIndex = path.join(distPath, "index.html");
  if (fs.existsSync(rootIndex) && fs.statSync(rootIndex).isFile()) {
    return { filePath: rootIndex, status: 200 };
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  // Se modo API mockada estiver ativo e a rota for de API ou /health
  if (apiMode === "mock" && (url.pathname.startsWith("/api/v1/") || url.pathname === "/health")) {
    const matched = matchRoute(req.method, url.pathname);
    if (!matched) {
      res.writeHead(501, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `unmocked ${req.method} ${url.pathname}` }));
      return;
    }

    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString("utf8");
      try {
        body = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        body = rawBody;
      }
    }

    try {
      const result = await matched.route.handler(
        {
          method: req.method,
          path: url.pathname,
          params: matched.params,
          query: url.searchParams,
          body,
          headers: req.headers,
        },
        { persona: seedPersona === "none" ? "learner" : seedPersona, dataset }
      );

      res.writeHead(result.status || 200, {
        "Content-Type": "application/json",
        ...(result.headers || {}),
      });
      res.end(JSON.stringify(result.body ?? {}));
      return;
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
      return;
    }
  }

  // Arquivos estáticos
  const resolved = resolveFilePath(url.pathname);
  if (!resolved) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(resolved.filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  if (ext === ".html" && seedPersona !== "none") {
    let html = fs.readFileSync(resolved.filePath, "utf8");
    const seedScript = generateSeedScript(seedPersona);
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>\n${seedScript}`);
    } else {
      html = seedScript + html;
    }
    res.writeHead(resolved.status, {
      "Content-Type": contentType,
      "Content-Length": Buffer.byteLength(html),
    });
    res.end(html);
  } else {
    res.writeHead(resolved.status, { "Content-Type": contentType });
    fs.createReadStream(resolved.filePath).pipe(res);
  }
});

server.listen(port, host, () => {
  console.log(`[serve.mjs] Serving ${distPath} on http://${host}:${port} (api=${apiMode}, seed=${seedPersona})`);
});
