import type { useCategoryFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import {
  ButtonGroup,
  ButtonMenu,
  FormLayout,
  Icon,
  SearchInput,
} from "@dimasbaguspm/versaur";
import { debounce, startCase } from "lodash";
import { ChevronDownIcon } from "lucide-react";
import { useMemo } from "react";

interface CategoryFilterFieldsProps {
  control: ReturnType<typeof useCategoryFilter>;
  hideSearch?: boolean;
  hideType?: boolean;
}

export const CategoryFilterFields = ({
  control,
  hideSearch,
  hideType,
}: CategoryFilterFieldsProps) => {
  const handleOnSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        control.replaceSingle("name", value || undefined);
      }, 300),
    [control],
  );

  const handleOnTypeFilterClick = (name: string) => {
    const currentTypes = control.getAll("type");
    if (currentTypes.includes(name)) {
      control.removeSingle("type", name);
    } else {
      control.replaceSingle("type", name);
    }
  };

  // ensure that all types are valid category types
  const hasTypeFilter = !!control.getAll("type").length
    ? control
        .getAll("type")
        .every((t) => ["expense", "income", "transfer"].includes(t))
    : false;

  return (
    <FormLayout className="mb-4">
      <When condition={!hideSearch}>
        <FormLayout.Column span={12}>
          <SearchInput
            defaultValue={control.appliedFilters.name}
            onChange={(ev) => handleOnSearchChange(ev.target.value)}
            placeholder="Search notes"
          />
        </FormLayout.Column>
      </When>
      <When condition={!hideType}>
        <FormLayout.Column span={12}>
          <ButtonGroup hasMargin>
            <ButtonMenu
              variant="outline"
              size="md"
              label={
                <>
                  <Icon as={ChevronDownIcon} color="inherit" size="sm" />
                  {hasTypeFilter
                    ? startCase(control.getSingle("type") || "")
                    : "Type"}
                </>
              }
            >
              <ButtonMenu.Item
                onClick={() => handleOnTypeFilterClick("expense")}
                active={control.getAll("type")?.includes("expense")}
              >
                Expense
              </ButtonMenu.Item>
              <ButtonMenu.Item
                onClick={() => handleOnTypeFilterClick("income")}
                active={control.getAll("type")?.includes("income")}
              >
                Income
              </ButtonMenu.Item>
              <ButtonMenu.Item
                onClick={() => handleOnTypeFilterClick("transfer")}
                active={control.getAll("type")?.includes("transfer")}
              >
                Transfer
              </ButtonMenu.Item>
            </ButtonMenu>
          </ButtonGroup>
        </FormLayout.Column>
      </When>
    </FormLayout>
  );
};
