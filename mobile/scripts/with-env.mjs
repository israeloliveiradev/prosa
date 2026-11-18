#!/usr/bin/env node
import { spawn } from "node:child_process";

const envVars = { ...process.env };
const args = process.argv.slice(2);
let cmdIndex = -1;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const eqIdx = arg.indexOf("=");
  // Parse KEY=VALUE pairs before the executable command
  if (eqIdx > 0 && !arg.startsWith("-") && cmdIndex === -1) {
    const key = arg.slice(0, eqIdx);
    const val = arg.slice(eqIdx + 1);
    envVars[key] = val;
  } else if (cmdIndex === -1) {
    cmdIndex = i;
    break;
  }
}

if (cmdIndex === -1) {
  console.error("Usage: node scripts/with-env.mjs KEY=VAL ... command [args...]");
  process.exit(1);
}

const command = args[cmdIndex];
const cmdArgs = args.slice(cmdIndex + 1);

const proc = spawn(command, cmdArgs, {
  stdio: "inherit",
  shell: true,
  env: envVars,
});

proc.on("exit", (code) => {
  process.exit(code ?? 0);
});
