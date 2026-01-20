import type { TransactionTemplateSearchModel } from "@/types/schemas";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";

export interface TransactionTemplateFilterModel {
  name?: TransactionTemplateSearchModel["name"];
  type?: TransactionTemplateSearchModel["type"];
  accountId?: TransactionTemplateSearchModel["accountId"];
  destinationAccountId?: TransactionTemplateSearchModel["destinationAccountId"];
  categoryId?: TransactionTemplateSearchModel["categoryId"];
  sortBy?: TransactionTemplateSearchModel["sortBy"];
  sortOrder?: TransactionTemplateSearchModel["sortOrder"];
  pageNumber?: TransactionTemplateSearchModel["pageNumber"];
  pageSize?: TransactionTemplateSearchModel["pageSize"];
}

export interface UseTransactionTemplateFilterReturn extends UseFilterStateReturn<TransactionTemplateFilterModel> {
  appliedFilters: TransactionTemplateFilterModel;
  humanizedFilters: [keyof TransactionTemplateFilterModel, string][];
}

const transactionTemplateFilterModel = new Map<
  keyof TransactionTemplateFilterModel,
  string
>([
  ["name", "Name"],
  ["type", "Type"],
  ["accountId", "Account"],
  ["destinationAccountId", "Destination Account"],
  ["categoryId", "Category"],
  ["sortBy", "Sort By"],
  ["sortOrder", "Sort Order"],
  ["pageNumber", "Page Number"],
  ["pageSize", "Page Size"],
] as const);

export const transactionTemplateFilterModelKeys = Array.from(
  transactionTemplateFilterModel.keys(),
) as (keyof TransactionTemplateFilterModel)[];

export const useTransactionTemplateFilter = (
  opts?: UseFilterStateOptions<TransactionTemplateFilterModel>,
): UseTransactionTemplateFilterReturn => {
  const filters = useFilterState<TransactionTemplateFilterModel>(opts);

  const appliedFilters: TransactionTemplateFilterModel = {
    name: filters.getSingle("name"),
    type: filters.getAll(
      "type",
    ) as unknown as TransactionTemplateFilterModel["type"],
    accountId: filters.getSingle(
      "accountId",
    ) as TransactionTemplateFilterModel["accountId"],
    destinationAccountId: filters.getSingle(
      "destinationAccountId",
    ) as TransactionTemplateFilterModel["destinationAccountId"],
    categoryId: filters.getSingle(
      "categoryId",
    ) as TransactionTemplateFilterModel["categoryId"],
    sortBy: filters.getSingle(
      "sortBy",
    ) as TransactionTemplateFilterModel["sortBy"],
    sortOrder: filters.getSingle(
      "sortOrder",
    ) as TransactionTemplateFilterModel["sortOrder"],
    pageNumber: filters.getSingle("pageNumber")
      ? Number(filters.getSingle("pageNumber"))
      : undefined,
    pageSize: filters.getSingle("pageSize")
      ? Number(filters.getSingle("pageSize"))
      : undefined,
  };

  const humanizedFilters = transactionTemplateFilterModelKeys.reduce(
    (acc, [key]) => {
      const typedKey = key as keyof TransactionTemplateFilterModel;
      switch (typedKey) {
        case "type":
          if (appliedFilters?.type?.length) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "name":
          if (appliedFilters?.name) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "accountId":
          if (appliedFilters?.accountId) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "destinationAccountId":
          if (appliedFilters?.destinationAccountId) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "categoryId":
          if (appliedFilters?.categoryId) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "sortBy":
          if (appliedFilters?.sortBy) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "sortOrder":
          if (appliedFilters?.sortOrder) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "pageNumber":
          if (appliedFilters?.pageNumber) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
        case "pageSize":
          if (appliedFilters?.pageSize) {
            acc.push([typedKey, transactionTemplateFilterModel.get(typedKey)!]);
          }
          break;
      }
      return acc;
    },
    [] as [keyof TransactionTemplateFilterModel, string][],
  );

  return {
    ...filters,
    appliedFilters,
    humanizedFilters,
    getSingle: (key: keyof TransactionTemplateFilterModel) =>
      filters.getSingle(key),
    getAll: (key: keyof TransactionTemplateFilterModel) => filters.getAll(key),
    removeSingle: (key: keyof TransactionTemplateFilterModel) =>
      filters.removeSingle(key),
    removeAll: () => filters.removeAll(transactionTemplateFilterModelKeys),
  };
};
