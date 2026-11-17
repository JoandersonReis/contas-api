export function allowedWebOrigins(
  configuredOrigin = "http://localhost:5173",
  environment = "development",
): string[] {
  const configured = new URL(configuredOrigin);
  const origins = new Set([configured.origin]);

  // Treat the two local frontend addresses equally, without allowing other ports.
  if (
    environment === "development" &&
    ["localhost", "127.0.0.1"].includes(configured.hostname)
  ) {
    const alias = new URL(configured.origin);
    alias.hostname =
      configured.hostname === "localhost" ? "127.0.0.1" : "localhost";
    origins.add(alias.origin);
  }

  return [...origins];
}
