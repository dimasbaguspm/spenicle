import type { Error } from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

interface HealthStatus {
  status: string;
  timestamp: string;
}

interface ApiInfo {
  message: string;
  status: string;
  timestamp: string;
}

// Health check
export const useApiHealthQuery = (): UseApiQueryResult<HealthStatus, Error> => {
  return useApiQuery<HealthStatus, never, Error>({
    queryKey: QUERY_KEYS.HEALTH.all(),
    path: '/health',
  });
};

// API info
export const useApiInfoQuery = (): UseApiQueryResult<ApiInfo, Error> => {
  return useApiQuery<ApiInfo, never, Error>({
    queryKey: ['api-info'],
    path: '/',
  });
};
