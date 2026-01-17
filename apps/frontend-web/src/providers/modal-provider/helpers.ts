import type { ModalParams } from "./types";

/**
 * Encodes modal params to a URL-safe string
 */
function encodeModalParams(params: ModalParams): string {
  if (!params || Object.keys(params).length === 0) return "";
  try {
    return btoa(JSON.stringify(params));
  } catch {
    // Fallback for environments without btoa
    return encodeURIComponent(JSON.stringify(params));
  }
}

/**
 * Decodes modal params from a URL string
 */
function decodeModalParams(encoded: string): ModalParams {
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
 * Parses the modal URL format: "modalId" or "modalId~base64Params"
 */
export function parseModalFromUrl(modalParam: string | null): {
  modalId: string | null;
  params: ModalParams;
} {
  if (!modalParam) {
    return { modalId: null, params: null };
  }

  const [modalId, encodedParams] = modalParam.split("~");
  const params = encodedParams ? decodeModalParams(encodedParams) : null;

  return { modalId: modalId || null, params };
}

/**
 * Formats modal state into URL format: "modalId" or "modalId~base64Params"
 */
export function formatModalForUrl(
  modalId: string,
  params?: ModalParams
): string {
  if (!params || Object.keys(params).length === 0) {
    return modalId;
  }
  const encoded = encodeModalParams(params);
  return `${modalId}~${encoded}`;
}
