import type { useTransactionTemplateFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { FormLayout, SearchInput } from "@dimasbaguspm/versaur";
import { debounce } from "lodash";
import { useMemo } from "react";

interface TransactionTemplateFilterFieldsProps {
  control: ReturnType<typeof useTransactionTemplateFilter>;
  hideSearch?: boolean;
}

export const TransactionTemplateFilterFields = ({
  control,
  hideSearch,
}: TransactionTemplateFilterFieldsProps) => {
  const handleOnSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        control.replaceSingle("name", value || undefined);
      }, 300),
    [control],
  );

  return (
    <FormLayout className="mb-4">
      <When condition={!hideSearch}>
        <FormLayout.Column span={12}>
          <SearchInput
            defaultValue={control.appliedFilters.name || ""}
            onChange={(ev) => handleOnSearchChange(ev.target.value)}
            placeholder="Search subscription"
          />
        </FormLayout.Column>
      </When>
    </FormLayout>
  );
};
