import { useSnackbars } from "@dimasbaguspm/versaur";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import querystring from "query-string";

import { BASE_URL } from "../constant";
import { getAccessToken, useSession } from "@/hooks/use-session";

import type {
  MutationObserverBaseResult,
  UseMutationOptions,
} from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface UseApiMutateOptions<TData, TVariables, TError> {
  path: string;
  method?: HttpMethod;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => Promise<unknown>;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables
  ) => void;
  silentError?: boolean;
  headers?: Record<string, string>;
}

type States = Pick<
  MutationObserverBaseResult,
  "isError" | "isIdle" | "isPending" | "isSuccess"
>;

export type UseApiMutateResult<TData, TVariables, TError> = [
  mutateAsync: (variables: TVariables) => Promise<TData>,
  error: TError | null,
  states: States,
  reset: () => void
];

export const useApiMutate = <
  TData,
  TVariables = unknown,
  TError = { message: string }
>(
  options: UseApiMutateOptions<TData, TVariables, TError>
): UseApiMutateResult<TData, TVariables, TError> => {
  const {
    path,
    method = "GET",
    onSuccess,
    onError,
    onMutate,
    onSettled,
    silentError = false,
  } = options;

  const { accessToken, clearSession } = useSession();
  const { showSnack } = useSnackbars();

  const mutationOptions: UseMutationOptions<TData, TError, TVariables> = {
    mutationFn: async (variables: TVariables) => {
      try {
        let response;

        const templatedPath = path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
          if (variables && typeof variables === "object" && key in variables) {
            return String((variables as Record<string, unknown>)[key]);
          }
          throw new Error(`Missing variable for path: ${key}`);
        });

        const axiosConfig: AxiosRequestConfig = {
          baseURL: BASE_URL,
          headers: {
            ...options.headers,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          withCredentials: true,
        };

        switch (method.toUpperCase()) {
          case "GET":
            response = await axios.get<TData>(templatedPath, {
              ...axiosConfig,
              params: variables,
              paramsSerializer: (params) => {
                return querystring.stringify(params, {
                  arrayFormat: "none",
                  skipEmptyString: true,
                });
              },
            });
            break;
          case "POST":
            response = await axios.post<TData>(
              templatedPath,
              variables,
              axiosConfig
            );
            break;
          case "PUT":
            response = await axios.put<TData>(
              templatedPath,
              variables,
              axiosConfig
            );
            break;
          case "PATCH":
            response = await axios.patch<TData>(
              templatedPath,
              variables,
              axiosConfig
            );
            break;
          case "DELETE":
            response = await axios.delete<TData>(templatedPath, {
              ...axiosConfig,
              data: variables,
            });
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }

        onSuccess?.(response.data, variables);
        return response.data;
      } catch (err) {
        let errorToThrow: TError;

        if (err instanceof AxiosError) {
          if (err.response?.status === 401) {
            clearSession();
          }
          // Use the response data if available, otherwise use the error message
          errorToThrow = err.response?.data?.message;
        } else {
          errorToThrow = err as TError;
        }

        if (!silentError) {
          // @ts-expect-error as expected
          showSnack("danger", errorToThrow || "An error occurred");
        }

        onError?.(errorToThrow, variables);
        throw errorToThrow;
      }
    },
    onMutate,
    onSettled: (data, error, variables) => {
      onSettled?.(data, error, variables);
    },
    meta: {
      silentError,
    },
  };

  const mutation = useMutation(mutationOptions);

  return [
    mutation.mutateAsync,
    mutation.error,
    {
      isError: mutation.isError,
      isIdle: mutation.isIdle,
      isPending: mutation.isPending,
      isSuccess: mutation.isSuccess,
    },
    mutation.reset,
  ];
};
