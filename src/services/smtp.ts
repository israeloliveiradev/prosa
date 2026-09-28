import { Socket } from "node:net";
import { assertSmtpAddress, smtpEnvelopeAddress } from "../security/smtp-address.js";

export async function sendSmtp(input: {
  host: string;
  port: number;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const envelope = smtpEnvelopeAddress(input.from);
  const recipient = assertSmtpAddress(input.to);
  const data = mimeMessage(input);

  const socket = new Socket();
  const replies: string[] = [];

  function readCode(): number {
    const last = replies.at(-1) ?? "";
    return Number(last.slice(0, 3));
  }

  try {
    await connect(socket, input.host, input.port, replies);
    if (readCode() !== 220) {
      return false;
    }
    if (!(await command(socket, replies, `EHLO prosa`, 250))) {
      return false;
    }
    if (!(await command(socket, replies, `MAIL FROM:<${envelope}>`, 250))) {
      return false;
    }
    if (!(await command(socket, replies, `RCPT TO:<${recipient}>`, 250))) {
      return false;
    }
    if (!(await command(socket, replies, "DATA", 354))) {
      return false;
    }
    socket.write(`${data}\r\n.\r\n`);
    if (!(await waitFor(socket, replies, 250))) {
      return false;
    }
    await command(socket, replies, "QUIT", 221);
    return true;
  } catch {
    return false;
  } finally {
    socket.destroy();
  }
}

function mimeMessage(input: { from: string; to: string; subject: string; text: string; html?: string }): string {
  const text = fold(input.text);
  const from = headerValue(input.from);
  const to = headerValue(input.to);
  const subject = encodeSubject(headerValue(input.subject));
  if (!input.html) {
    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      text,
    ].join("\r\n");
  }
  const boundary = "prosa-letter";
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    fold(input.html),
    `--${boundary}--`,
  ].join("\r\n");
}

function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function fold(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n").replace(/^\./gm, "..");
}

function encodeSubject(value: string): string {
  if (/^[\x20-\x7E]+$/.test(value)) {
    return value;
  }
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function connect(socket: Socket, host: string, port: number, replies: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.setTimeout(8_000);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("smtp timeout")));
    listen(socket, replies);
    socket.connect(port, host, () => undefined);
    waitFor(socket, replies, 220).then(() => resolve(), reject);
  });
}

function command(socket: Socket, replies: string[], line: string, expected: number): Promise<boolean> {
  socket.write(`${line}\r\n`);
  return waitFor(socket, replies, expected);
}

function waitFor(socket: Socket, replies: string[], expected: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = replies.length;
    const timer = setTimeout(() => resolve(false), 8_000);
    const onData = () => {
      if (replies.length === started) {
        return;
      }
      const last = replies.at(-1) ?? "";
      const code = Number(last.slice(0, 3));
      if (code >= 400) {
        clearTimeout(timer);
        socket.off("data", onData);
        resolve(false);
        return;
      }
      const done = expected === 250 ? last.startsWith("250 ") : code === expected;
      if (done) {
        clearTimeout(timer);
        socket.off("data", onData);
        resolve(true);
      }
    };
    socket.on("data", onData);
  });
}

function listen(socket: Socket, replies: string[]): void {
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (/^\d{3}[ -]/.test(part)) {
        replies.push(part);
      }
    }
  });
}
