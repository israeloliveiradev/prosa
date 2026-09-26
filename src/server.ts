import { buildApp } from "./app.js";
import { loadEnv } from "./config.js";

const env = loadEnv();
const app = await buildApp(env);

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error({ err: error }, "server failed to start");
  await app.close();
  process.exit(1);
}
