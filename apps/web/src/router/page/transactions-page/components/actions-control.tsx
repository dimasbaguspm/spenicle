import { useTransactionFilter } from "@/hooks/use-filter-state";
import { DateFormat, formatDate } from "@/lib/format-date/format-date";
import { When } from "@/lib/when";
import { TransactionFilterFields } from "@/ui/transaction-filter-fields";
import {
  Button,
  ButtonGroup,
  ButtonMenu,
  FilterChip,
  FilterChipGroup,
  Icon,
} from "@dimasbaguspm/versaur";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { startCase } from "lodash";
import { CalendarCogIcon, ChevronDownIcon } from "lucide-react";
import { useRef, type ChangeEvent, type FC } from "react";

interface ActionsControlProps {
  date: Dayjs;
  onDateChange: (date: Dayjs) => void;
}

export const ActionsControl: FC<ActionsControlProps> = ({
  date,
  onDateChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const filters = useTransactionFilter({ adapter: "url" });

  const handleOnCalendarClick = () => {
    if (!inputRef.current) return;

    if ("showPicker" in inputRef.current) {
      inputRef.current?.showPicker();
    } else {
      // @ts-expect-error as a fallback
      inputRef.current?.focus();
    }
  };

  const handleOnDateChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const value = ev.target.value;
    if (value) {
      onDateChange(dayjs(value));
    } else {
      onDateChange(dayjs());
    }
  };

  const handleOnTypeFilterClick = (name: string) => {
    const currentTypes = filters.getAll("type");
    if (currentTypes.includes(name)) {
      filters.removeSingle("type", name);
    } else {
      filters.replaceSingle("type", name);
    }
  };

  const hasTypeFilter = !!filters.getAll("type").length;

  return (
    <>
      <ButtonGroup alignment="between" className="mb-4">
        <ButtonMenu
          variant="outline"
          size="md"
          placement="bottom-left"
          label={
            <>
              <Icon as={ChevronDownIcon} color="inherit" size="sm" />
              {hasTypeFilter
                ? startCase(filters.getSingle("type") || "")
                : "Type"}
            </>
          }
        >
          <ButtonMenu.Item
            onClick={() => handleOnTypeFilterClick("expense")}
            active={filters.getAll("type")?.includes("expense")}
          >
            Expense
          </ButtonMenu.Item>
          <ButtonMenu.Item
            onClick={() => handleOnTypeFilterClick("income")}
            active={filters.getAll("type")?.includes("income")}
          >
            Income
          </ButtonMenu.Item>
          <ButtonMenu.Item
            onClick={() => handleOnTypeFilterClick("transfer")}
            active={filters.getAll("type")?.includes("transfer")}
          >
            Transfer
          </ButtonMenu.Item>
        </ButtonMenu>
        <Button
          variant="outline"
          onClick={handleOnCalendarClick}
          className="relative"
        >
          <Icon as={CalendarCogIcon} size="sm" color="gray" />
          Calendar
          <input
            type="date"
            tabIndex={-1}
            className="sr-only absolute -bottom-2.5 right-50 translate-x-1/2"
            ref={inputRef}
            value={formatDate(date, DateFormat.ISO_DATE)}
            onChange={handleOnDateChange}
          />
        </Button>
      </ButtonGroup>

      <When condition={filters.humanizedFilters.length > 0}>
        <FilterChipGroup overlay hasMargin>
          {filters.humanizedFilters.map(([key, label]) => (
            <FilterChip key={key} onClick={() => filters.removeSingle(key)}>
              {label}
            </FilterChip>
          ))}
        </FilterChipGroup>
      </When>
    </>
  );
};
