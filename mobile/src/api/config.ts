/**
 * Retorna a URL base da API Prosa.
 * Prioridade:
 * 1. EXPO_PUBLIC_API_URL (sem barra final)
 * 2. Web: http://<hostname>:3000
 * 3. Nativo: http://127.0.0.1:3000
 */
export function apiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:3000`;
  }
  return "http://127.0.0.1:3000";
}

/**
 * Converte caminhos relativos (como áudios e uploads) em URLs absolutas.
 */
export function absoluteUrl(path: string): string {
  if (!path) {
    return "";
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl()}${cleanPath}`;
}
