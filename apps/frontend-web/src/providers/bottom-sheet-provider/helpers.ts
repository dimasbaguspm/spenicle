import type { BottomSheetParams } from "./types";

/**
 * Encodes bottomSheet params to a URL-safe string
 */
function encodeBottomSheetParams(params: BottomSheetParams): string {
  if (!params || Object.keys(params).length === 0) return "";
  try {
    return btoa(JSON.stringify(params));
  } catch {
    // Fallback for environments without btoa
    return encodeURIComponent(JSON.stringify(params));
  }
}

/**
 * Decodes bottomSheet params from a URL string
 */
function decodeBottomSheetParams(encoded: string): BottomSheetParams {
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
 * Parses the bottomSheet URL format: "bottomSheetId" or "bottomSheetId~base64Params"
 */
export function parseBottomSheetFromUrl(bottomSheetParam: string | null): {
  bottomSheetId: string | null;
  params: BottomSheetParams;
} {
  if (!bottomSheetParam) {
    return { bottomSheetId: null, params: null };
  }

  const [bottomSheetId, encodedParams] = bottomSheetParam.split("~");
  const params = encodedParams ? decodeBottomSheetParams(encodedParams) : null;

  return { bottomSheetId: bottomSheetId || null, params };
}

/**
 * Formats bottomSheet state into URL format: "bottomSheetId" or "bottomSheetId~base64Params"
 */
export function formatBottomSheetForUrl(
  bottomSheetId: string,
  params?: BottomSheetParams
): string {
  if (!params || Object.keys(params).length === 0) {
    return bottomSheetId;
  }
  const encoded = encodeBottomSheetParams(params);
  return `${bottomSheetId}~${encoded}`;
}
