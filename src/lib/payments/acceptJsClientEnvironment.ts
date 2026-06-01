/**
 * Authorize.Net Accept.js requires HTTPS in production.
 * Sandbox allows HTTP only when the page hostname is exactly `localhost`.
 */
export function getAcceptJsClientEnvironmentError(): string | null {
  if (typeof window === "undefined") return null;

  const { protocol, hostname, port } = window.location;
  if (protocol === "https:") return null;
  if (hostname === "localhost") return null;

  const portSuffix = port ? `:${port}` : "";

  if (hostname === "127.0.0.1" || hostname === "[::1]") {
    return `Authorize.Net Accept.js requires HTTPS, or open this page at http://localhost${portSuffix} for local sandbox testing (not ${hostname}).`;
  }

  return `Authorize.Net Accept.js requires a secure connection. Use https://${hostname}${portSuffix}, or http://localhost${portSuffix} when testing locally in sandbox.`;
}

export function getAcceptJsLocalhostFixUrl(): string | null {
  if (typeof window === "undefined") return null;
  const { hostname, port, pathname, search, hash } = window.location;
  if (hostname === "localhost" || window.location.protocol === "https:") return null;
  if (hostname !== "127.0.0.1" && hostname !== "[::1]") return null;
  const portSuffix = port ? `:${port}` : "";
  return `http://localhost${portSuffix}${pathname}${search}${hash}`;
}

export function isAcceptJsHttpsError(message: string): boolean {
  return /https/i.test(message) && /required|connection|secure/i.test(message);
}

export function enrichAcceptJsHttpsError(message: string): string {
  const envError = getAcceptJsClientEnvironmentError();
  if (envError) return envError;
  return message;
}
