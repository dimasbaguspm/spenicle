import type { TransactionSearchModel } from "@/types/schemas";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";

export interface TransactionFilterModel {
  id?: TransactionSearchModel["id"];
  type?: TransactionSearchModel["type"];
  startDate?: TransactionSearchModel["startDate"];
  endDate?: TransactionSearchModel["endDate"];
  minAmount?: TransactionSearchModel["minAmount"];
  maxAmount?: TransactionSearchModel["maxAmount"];
  accountIds?: TransactionSearchModel["accountId"];
  destinationAccountIds?: TransactionSearchModel["destinationAccountId"];
  categoryIds?: TransactionSearchModel["categoryId"];
  tagIds?: TransactionSearchModel["tagId"];
  sortBy?: TransactionSearchModel["sortBy"];
  sortOrder?: TransactionSearchModel["sortOrder"];
  pageNumber?: TransactionSearchModel["pageNumber"];
  pageSize?: TransactionSearchModel["pageSize"];
}

export interface UseTransactionFilterReturn extends UseFilterStateReturn<TransactionFilterModel> {
  appliedFilters: TransactionFilterModel;
  humanizedFilters: [keyof TransactionFilterModel, string][];
}

const transactionFilterModel = new Map<keyof TransactionFilterModel, string>([
  ["id", "Id"],
  ["type", "Type"],
  ["startDate", "Start Date"],
  ["endDate", "End Date"],
  ["minAmount", "Min Amount"],
  ["maxAmount", "Max Amount"],
  ["accountIds", "Account Ids"],
  ["destinationAccountIds", "Destination Account Ids"],
  ["categoryIds", "Category Ids"],
  ["tagIds", "Tag Ids"],
  ["sortBy", "Sort By"],
  ["sortOrder", "Sort Order"],
  ["pageNumber", "Page Number"],
  ["pageSize", "Page Size"],
] as const);

export const transactionFilterModelKeys = Array.from(
  transactionFilterModel.keys(),
) as (keyof TransactionFilterModel)[];

export const useTransactionFilter = (
  opts?: UseFilterStateOptions<TransactionFilterModel>,
): UseTransactionFilterReturn => {
  const filters = useFilterState<TransactionFilterModel>(opts);

  const appliedFilters: TransactionFilterModel = {
    id: filters.getAll("id").map(Number),
    type: filters.getAll("type") as TransactionSearchModel["type"],
    startDate: filters.getSingle("startDate"),
    endDate: filters.getSingle("endDate"),
    minAmount: filters.getSingle("minAmount")
      ? Number(filters.getSingle("minAmount"))
      : undefined,
    maxAmount: filters.getSingle("maxAmount")
      ? Number(filters.getSingle("maxAmount"))
      : undefined,
    accountIds: filters.getAll("accountIds").map(Number),
    destinationAccountIds: filters.getAll("destinationAccountIds").map(Number),
    categoryIds: filters.getAll("categoryIds").map(Number),
    tagIds: filters.getAll("tagIds").map(Number),
    sortBy: filters.getSingle("sortBy") as TransactionSearchModel["sortBy"],
    sortOrder: filters.getSingle(
      "sortOrder",
    ) as TransactionSearchModel["sortOrder"],
    pageNumber: filters.getSingle("pageNumber")
      ? Number(filters.getSingle("pageNumber"))
      : undefined,
    pageSize: filters.getSingle("pageSize")
      ? Number(filters.getSingle("pageSize"))
      : undefined,
  };

  const humanizedFilters = transactionFilterModelKeys.reduce(
    (acc, [key]) => {
      const typedKey = key as keyof TransactionFilterModel;
      switch (typedKey) {
        case "id":
          if (appliedFilters?.id?.length) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "type":
          if (appliedFilters?.type?.length) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "startDate":
          if (appliedFilters?.startDate) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "endDate":
          if (appliedFilters?.endDate) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "minAmount":
          if (appliedFilters?.minAmount) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "maxAmount":
          if (appliedFilters?.maxAmount) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "accountIds":
          if (appliedFilters?.accountIds?.length) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "destinationAccountIds":
          if (appliedFilters?.destinationAccountIds?.length) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "sortBy":
          if (appliedFilters?.sortBy) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "sortOrder":
          if (appliedFilters?.sortOrder) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "pageNumber":
          if (appliedFilters?.pageNumber) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
        case "pageSize":
          if (appliedFilters?.pageSize) {
            acc.push([typedKey, transactionFilterModel.get(typedKey)!]);
          }
          break;
      }
      return acc;
    },
    [] as [keyof TransactionFilterModel, string][],
  );

  return {
    ...filters,
    appliedFilters,
    humanizedFilters,
    getSingle: (key: keyof TransactionFilterModel) => filters.getSingle(key),
    getAll: (key: keyof TransactionFilterModel) => filters.getAll(key),
    removeSingle: (key: keyof TransactionFilterModel) =>
      filters.removeSingle(key),
    removeAll: () => filters.removeAll(transactionFilterModelKeys),
  };
};
