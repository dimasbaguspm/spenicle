import type { useTransactionFilter } from "@/hooks/use-filter-state";
import { DateFormat, formatDate } from "@/lib/format-date/format-date";
import { When } from "@/lib/when";
import {
  Button,
  ButtonGroup,
  ButtonMenu,
  FormLayout,
  Icon,
} from "@dimasbaguspm/versaur";
import dayjs from "dayjs";
import { startCase } from "lodash";
import { ChevronDownIcon } from "lucide-react";
import { useRef } from "react";

interface TransactionFilterFieldsProps {
  control: ReturnType<typeof useTransactionFilter>;
  hideType?: boolean;
  hideDateRange?: boolean;
}

export const TransactionFilterFields = ({
  control,
  hideType,
  hideDateRange,
}: TransactionFilterFieldsProps) => {
  const startDateRef = useRef<HTMLInputElement | null>(null);
  const endDateRef = useRef<HTMLInputElement | null>(null);

  const handleOnTypeFilterClick = (name: string) => {
    const currentTypes = control.getAll("type");
    if (currentTypes.includes(name)) {
      control.removeSingle("type", name);
    } else {
      control.replaceSingle("type", name);
    }
  };

  const handleOnDateClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (!ref?.current) return;

    if (typeof ref.current?.showPicker === "function") {
      ref.current.showPicker();
    } else {
      ref.current.focus();
    }
  };

  const hasTypeFilter = !!control.getAll("type").length;
  return (
    <FormLayout className="mb-4">
      <When condition={!hideType || !hideDateRange}>
        <FormLayout.Column span={12}>
          <ButtonGroup hasMargin>
            <When condition={!hideType}>
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
            </When>
            <When condition={!hideDateRange}>
              <Button
                variant="outline"
                onClick={() => handleOnDateClick(startDateRef)}
                className="relative"
              >
                <Icon as={ChevronDownIcon} color="inherit" size="sm" />
                {control.appliedFilters.startDate
                  ? formatDate(
                      control.appliedFilters.startDate,
                      DateFormat.COMPACT_DATE,
                    )
                  : "Start"}
                <input
                  type="date"
                  tabIndex={-1}
                  max={control.appliedFilters.endDate || undefined}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      control.removeSingle("startDate");
                    } else {
                      control.replaceSingle("startDate", e.target.value);
                    }
                  }}
                  className="sr-only absolute -bottom-2.5 right-50 translate-x-1/2"
                  ref={startDateRef}
                />
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOnDateClick(endDateRef)}
                className="relative"
              >
                <Icon as={ChevronDownIcon} color="inherit" size="sm" />
                {control.appliedFilters.endDate
                  ? formatDate(
                      control.appliedFilters.endDate,
                      DateFormat.COMPACT_DATE,
                    )
                  : "End"}
                <input
                  type="date"
                  tabIndex={-1}
                  min={control.appliedFilters.startDate || undefined}
                  max={formatDate(dayjs().startOf("day"), DateFormat.ISO_DATE)}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      control.removeSingle("endDate");
                    } else {
                      control.replaceSingle("endDate", e.target.value);
                    }
                  }}
                  className="sr-only absolute -bottom-2.5 right-50 translate-x-1/2"
                  ref={endDateRef}
                />
              </Button>
            </When>
          </ButtonGroup>
        </FormLayout.Column>
      </When>
    </FormLayout>
  );
};
