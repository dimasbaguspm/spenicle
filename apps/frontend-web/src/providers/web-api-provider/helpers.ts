import type { PermissionStatus, PermissionStatusFlags } from "./types";

/**
 * Check if Permissions API is supported by the browser
 */
export const isPermissionsAPISupported = (): boolean => {
  return 'permissions' in navigator;
};

/**
 * Query permission status using Permissions API
 * Generic helper that works for any Web API permission
 * @param permissionName - The name of the permission to query (e.g., 'geolocation', 'camera', 'notifications')
 */
export const queryPermissionStatus = async (
  permissionName: PermissionName
): Promise<PermissionStatus> => {
  if (!isPermissionsAPISupported()) {
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: permissionName });
    return result.state as PermissionStatus;
  } catch {
    return 'prompt';
  }
};

/**
 * Convert permission status to boolean flags
 * Reusable pattern for all permission types
 */
export const getPermissionFlags = (status: PermissionStatus): PermissionStatusFlags => {
  return {
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isPrompt: status === 'prompt',
    isUnavailable: status === 'unavailable',
  };
};
