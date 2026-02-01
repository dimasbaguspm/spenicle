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

// Validation guard functions
const isValidNumber = (value: any): value is number => {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
};

const isValidPositiveNumber = (value: any): value is number => {
  return isValidNumber(value) && value > 0;
};

const isValidPageNumber = (value: any): value is number => {
  return isValidPositiveNumber(value) && value >= 1;
};

const isValidPageSize = (value: any): value is number => {
  return isValidPositiveNumber(value) && value >= 1 && value <= 100;
};

const isValidSortBy = (
  value: any,
): value is TransactionSearchModel["sortBy"] => {
  const validSortBy = [
    "id",
    "type",
    "date",
    "amount",
    "createdAt",
    "updatedAt",
  ];
  return typeof value === "string" && validSortBy.includes(value);
};

const isValidSortOrder = (
  value: any,
): value is TransactionSearchModel["sortOrder"] => {
  return value === "asc" || value === "desc";
};

const isValidTransactionType = (
  value: any,
): value is "expense" | "income" | "transfer" => {
  const validTypes = ["expense", "income", "transfer"];
  return typeof value === "string" && validTypes.includes(value);
};

const isValidDateString = (value: any): value is string => {
  return typeof value === "string" && !isNaN(Date.parse(value));
};

const isValidIdArray = (value: any): value is number[] => {
  return (
    Array.isArray(value) && value.every((item) => isValidPositiveNumber(item))
  );
};

const isValidTypeArray = (
  value: any,
): value is TransactionSearchModel["type"] => {
  return (
    Array.isArray(value) && value.every((item) => isValidTransactionType(item))
  );
};

export const useTransactionFilter = (
  opts?: UseFilterStateOptions<TransactionFilterModel>,
): UseTransactionFilterReturn => {
  const filters = useFilterState<TransactionFilterModel>(opts);

  const appliedFilters: TransactionFilterModel = {
    id: (() => {
      const ids = filters.getAll("id").map(Number);
      return isValidIdArray(ids) ? ids : undefined;
    })(),
    type: (() => {
      const types = filters.getAll("type");
      return isValidTypeArray(types)
        ? (types as TransactionSearchModel["type"])
        : undefined;
    })(),
    startDate: (() => {
      const date = filters.getSingle("startDate");
      return isValidDateString(date) ? date : undefined;
    })(),
    endDate: (() => {
      const date = filters.getSingle("endDate");
      return isValidDateString(date) ? date : undefined;
    })(),
    minAmount: (() => {
      const amount = filters.getSingle("minAmount");
      const numAmount = amount ? Number(amount) : undefined;
      return isValidNumber(numAmount) && numAmount >= 0 ? numAmount : undefined;
    })(),
    maxAmount: (() => {
      const amount = filters.getSingle("maxAmount");
      const numAmount = amount ? Number(amount) : undefined;
      return isValidNumber(numAmount) && numAmount >= 0 ? numAmount : undefined;
    })(),
    accountIds: (() => {
      const ids = filters.getAll("accountIds").map(Number);
      return isValidIdArray(ids) ? ids : undefined;
    })(),
    destinationAccountIds: (() => {
      const ids = filters.getAll("destinationAccountIds").map(Number);
      return isValidIdArray(ids) ? ids : undefined;
    })(),
    categoryIds: (() => {
      const ids = filters.getAll("categoryIds").map(Number);
      return isValidIdArray(ids) ? ids : undefined;
    })(),
    tagIds: (() => {
      const ids = filters.getAll("tagIds").map(Number);
      return isValidIdArray(ids) ? ids : undefined;
    })(),
    sortBy: (() => {
      const sortBy = filters.getSingle("sortBy");
      return isValidSortBy(sortBy)
        ? (sortBy as TransactionSearchModel["sortBy"])
        : "date";
    })(),
    sortOrder: (() => {
      const sortOrder = filters.getSingle("sortOrder");
      return isValidSortOrder(sortOrder)
        ? (sortOrder as TransactionSearchModel["sortOrder"])
        : "desc";
    })(),
    pageNumber: (() => {
      const page = filters.getSingle("pageNumber");
      const numPage = page ? Number(page) : undefined;
      return isValidPageNumber(numPage) ? numPage : 1;
    })(),
    pageSize: (() => {
      const size = filters.getSingle("pageSize");
      const numSize = size ? Number(size) : undefined;
      return isValidPageSize(numSize) ? numSize : 25;
    })(),
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
