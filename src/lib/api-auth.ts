import "server-only";

/**
 * Simple API-key check for machine-to-machine endpoints (website sync).
 * Returns null when the key is valid, or a Response to return immediately
 * when it isn't (missing config -> 503, bad/missing key -> 401).
 */
export function verifyApiKey(request: Request): Response | null {
  const configuredKey = process.env.WEBSITE_SYNC_API_KEY;

  if (!configuredKey) {
    return Response.json(
      { error: "Website sync not configured" },
      { status: 503 }
    );
  }

  const providedKey = request.headers.get("x-api-key");
  if (!providedKey || providedKey !== configuredKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
