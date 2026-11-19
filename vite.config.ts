import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: [
      "kokoro-js",
      "@huggingface/transformers",
      "@mintplex-labs/piper-tts-web",
      "piper-tts-web",
    ],
  },
});
