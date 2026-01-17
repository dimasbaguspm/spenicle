import type { useAccountFilter } from "@/hooks/use-filter-state";
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

interface AccountFilterFieldsProps {
  control: ReturnType<typeof useAccountFilter>;
  hideSearch?: boolean;
  hideType?: boolean;
}

export const AccountFilterFields = ({
  control,
  hideSearch,
  hideType,
}: AccountFilterFieldsProps) => {
  const handleOnSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        control.replaceSingle("name", value || undefined);
      }, 300),
    [control]
  );

  const handleOnTypeFilterClick = (name: string) => {
    const currentTypes = control.getAll("type");
    if (currentTypes.includes(name)) {
      control.removeSingle("type", name);
    } else {
      control.replaceSingle("type", name);
    }
  };

  // ensure that all types are valid account types
  const hasTypeFilter = !!control.getAll("type").length
    ? control.getAll("type").every((t) => ["expense", "income"].includes(t))
    : false;
  return (
    <FormLayout className="mb-4">
      <When condition={!hideSearch}>
        <FormLayout.Column span={12}>
          <SearchInput
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
            </ButtonMenu>
          </ButtonGroup>
        </FormLayout.Column>
      </When>
    </FormLayout>
  );
};
