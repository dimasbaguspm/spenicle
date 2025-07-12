import { useMemo } from 'react';

interface AppVersionInfo {
  version: string;
  buildTime: string;
  packageVersion: string;
  formattedVersion: string;
}

/**
 * hook to get app version and build information
 * @returns app version info including version and build time
 */
export const useAppVersion = (): AppVersionInfo => {
  const isDev = process.env.NODE_ENV === 'development';

  return useMemo(() => {
    const version = isDev ? 'Development' : import.meta.env.VITE_APP_VERSION;
    const buildTime = isDev ? ' Development' : import.meta.env.VITE_BUILD_TIME;
    const packageVersion = isDev ? 'Development' : import.meta.env.VITE_PACKAGE_VERSION;
    const formattedVersion = isDev ? 'Development' : `v${version}`;

    return {
      version,
      buildTime,
      packageVersion,
      formattedVersion,
    };
  }, []);
};
