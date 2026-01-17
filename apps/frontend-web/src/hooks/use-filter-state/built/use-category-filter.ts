import type { CategorySearchModel } from "@/types/schemas";
import {
  useFilterState,
  type UseFilterStateOptions,
  type UseFilterStateReturn,
} from "../base/use-filter-state";

export interface CategoryFilterModel {
  id?: CategorySearchModel["id"];
  name?: CategorySearchModel["name"];
  type?: CategorySearchModel["type"];
  archived?: CategorySearchModel["archived"];
  sortBy?: CategorySearchModel["sortBy"];
  sortOrder?: CategorySearchModel["sortOrder"];
  pageNumber?: CategorySearchModel["pageNumber"];
  pageSize?: CategorySearchModel["pageSize"];
}

export interface UseCategoryFilterReturn
  extends UseFilterStateReturn<CategoryFilterModel> {
  appliedFilters: CategoryFilterModel;
  humanizedFilters: [keyof CategoryFilterModel, string][];
}

const categoryFilterModel = new Map<keyof CategoryFilterModel, string>([
  ["id", "Id"],
  ["name", "Name"],
  ["type", "Type"],
  ["archived", "Archived"],
  ["sortBy", "Sort By"],
  ["sortOrder", "Sort Order"],
  ["pageNumber", "Page Number"],
  ["pageSize", "Page Size"],
] as const);

export const categoryFilterModelKeys = Array.from(
  categoryFilterModel.keys()
) as (keyof CategoryFilterModel)[];

export const useCategoryFilter = (
  opts?: UseFilterStateOptions<CategoryFilterModel>
): UseCategoryFilterReturn => {
  const filters = useFilterState<CategoryFilterModel>(opts);

  const appliedFilters: CategoryFilterModel = {
    id: filters.getAll("id").map(Number),
    name: filters.getSingle("name"),
    type: filters.getAll("type") as CategorySearchModel["type"],
    archived: filters.getSingle("archived") as CategorySearchModel["archived"],
    sortBy: filters.getSingle("sortBy") as CategorySearchModel["sortBy"],
    sortOrder: filters.getSingle("sortOrder") as
      | CategorySearchModel["sortOrder"],
    pageNumber: filters.getSingle("pageNumber")
      ? Number(filters.getSingle("pageNumber"))
      : undefined,
    pageSize: filters.getSingle("pageSize")
      ? Number(filters.getSingle("pageSize"))
      : undefined,
  };

  const humanizedFilters = categoryFilterModelKeys.reduce((acc, [key]) => {
    const typedKey = key as keyof CategoryFilterModel;
    switch (typedKey) {
      case "id":
        if (appliedFilters?.id?.length) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "type":
        if (appliedFilters?.type?.length) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "name":
        if (appliedFilters?.name) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "archived":
        if (appliedFilters?.archived) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "sortBy":
        if (appliedFilters?.sortBy) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "sortOrder":
        if (appliedFilters?.sortOrder) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "pageNumber":
        if (appliedFilters?.pageNumber) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
      case "pageSize":
        if (appliedFilters?.pageSize) {
          acc.push([typedKey, categoryFilterModel.get(typedKey)!]);
        }
        break;
    }
    return acc;
  }, [] as [keyof CategoryFilterModel, string][]);

  return {
    ...filters,
    appliedFilters,
    humanizedFilters,
    getSingle: (key: keyof CategoryFilterModel) => filters.getSingle(key),
    getAll: (key: keyof CategoryFilterModel) => filters.getAll(key),
    removeSingle: (key: keyof CategoryFilterModel) => filters.removeSingle(key),
    removeAll: () => filters.removeAll(categoryFilterModelKeys),
  };
};
