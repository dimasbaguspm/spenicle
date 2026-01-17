import type { AccountSearchModel } from "@/types/schemas";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";

export interface AccountFilterModel {
  id?: AccountSearchModel["id"];
  name?: AccountSearchModel["name"];
  type?: AccountSearchModel["type"];
  archived?: AccountSearchModel["archived"];
  sortBy?: AccountSearchModel["sortBy"];
  sortOrder?: AccountSearchModel["sortOrder"];
  pageNumber?: AccountSearchModel["pageNumber"];
  pageSize?: AccountSearchModel["pageSize"];
}

export interface UseAccountFilterReturn
  extends UseFilterStateReturn<AccountFilterModel> {
  appliedFilters: AccountFilterModel;
  humanizedFilters: [keyof AccountFilterModel, string][];
}

const accountFilterModel = new Map<keyof AccountFilterModel, string>([
  ["id", "Id"],
  ["name", "Name"],
  ["type", "Type"],
  ["archived", "Archived"],
  ["sortBy", "Sort By"],
  ["sortOrder", "Sort Order"],
  ["pageNumber", "Page Number"],
  ["pageSize", "Page Size"],
] as const);

export const accountFilterModelKeys = Array.from(
  accountFilterModel.keys()
) as (keyof AccountFilterModel)[];

export const useAccountFilter = (
  opts?: UseFilterStateOptions<AccountFilterModel>
): UseAccountFilterReturn => {
  const filters = useFilterState<AccountFilterModel>(opts);

  const appliedFilters: AccountFilterModel = {
    id: filters.getAll("id").map(Number),
    name: filters.getSingle("name"),
    type: filters.getAll("type") as AccountSearchModel["type"],
    archived: filters.getSingle("archived") as AccountSearchModel["archived"],
    sortBy: filters.getSingle("sortBy") as AccountSearchModel["sortBy"],
    sortOrder: filters.getSingle(
      "sortOrder"
    ) as AccountSearchModel["sortOrder"],
    pageNumber: filters.getSingle("pageNumber")
      ? Number(filters.getSingle("pageNumber"))
      : undefined,
    pageSize: filters.getSingle("pageSize")
      ? Number(filters.getSingle("pageSize"))
      : undefined,
  };

  const humanizedFilters = accountFilterModelKeys.reduce((acc, [key]) => {
    const typedKey = key as keyof AccountFilterModel;
    switch (typedKey) {
      case "id":
        if (appliedFilters?.id?.length) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "type":
        if (appliedFilters?.type?.length) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "name":
        if (appliedFilters?.name) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "archived":
        if (appliedFilters?.archived) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "sortBy":
        if (appliedFilters?.sortBy) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "sortOrder":
        if (appliedFilters?.sortOrder) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "pageNumber":
        if (appliedFilters?.pageNumber) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
      case "pageSize":
        if (appliedFilters?.pageSize) {
          acc.push([typedKey, accountFilterModel.get(typedKey)!]);
        }
        break;
    }
    return acc;
  }, [] as [keyof AccountFilterModel, string][]);

  return {
    ...filters,
    appliedFilters,
    humanizedFilters,
    getSingle: (key: keyof AccountFilterModel) => filters.getSingle(key),
    getAll: (key: keyof AccountFilterModel) => filters.getAll(key),
    removeSingle: (key: keyof AccountFilterModel) => filters.removeSingle(key),
    removeAll: () => filters.removeAll(accountFilterModelKeys),
  };
};
