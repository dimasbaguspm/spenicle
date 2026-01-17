import type { DrawerParams } from "./types";

/**
 * Encodes drawer params to a URL-safe string
 */
function encodeDrawerParams(params: DrawerParams): string {
  if (!params || Object.keys(params).length === 0) return "";
  try {
    return btoa(JSON.stringify(params));
  } catch {
    // Fallback for environments without btoa
    return encodeURIComponent(JSON.stringify(params));
  }
}

/**
 * Decodes drawer params from a URL string
 */
function decodeDrawerParams(encoded: string): DrawerParams {
  if (!encoded) return null;
  try {
    return JSON.parse(atob(encoded));
  } catch {
    try {
      return JSON.parse(decodeURIComponent(encoded));
    } catch {
      // If all parsing fails, return the raw string as a fallback
      return { value: encoded };
    }
  }
}

/**
 * Parses the drawer URL format: "drawerId" or "drawerId~base64Params"
 */
export function parseDrawerFromUrl(drawerParam: string | null): {
  drawerId: string | null;
  params: DrawerParams;
} {
  if (!drawerParam) {
    return { drawerId: null, params: null };
  }

  const [drawerId, encodedParams] = drawerParam.split("~");
  const params = encodedParams ? decodeDrawerParams(encodedParams) : null;

  return { drawerId: drawerId || null, params };
}

/**
 * Formats drawer state into URL format: "drawerId" or "drawerId~base64Params"
 */
export function formatDrawerForUrl(
  drawerId: string,
  params?: DrawerParams
): string {
  if (!params || Object.keys(params).length === 0) {
    return drawerId;
  }
  const encoded = encodeDrawerParams(params);
  return `${drawerId}~${encoded}`;
}
