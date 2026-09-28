const ADDRESS = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

export function smtpEnvelopeAddress(from: string): string {
  const raw = from.match(/<([^>]+)>/)?.[1] ?? from;
  return assertSmtpAddress(raw);
}

export function assertSmtpAddress(value: string): string {
  const address = value.trim();
  if (
    address.length === 0 ||
    address.length > 160 ||
    /[\r\n<>\s,]/.test(address) ||
    !ADDRESS.test(address)
  ) {
    throw new Error("Invalid SMTP address");
  }
  return address;
}
