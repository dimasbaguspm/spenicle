import { useInsightFilter } from "@/hooks/use-filter-state";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  Button,
  ButtonGroup,
  Drawer,
  useDesktopBreakpoint,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";
import { Form, formId } from "./form";
import type { FilterInsightFormSchema } from "./types";
import {
  convertInsightFilterToFormSchema,
  extractDateRangeFromPreset,
} from "./helpers";
import dayjs from "dayjs";

interface InsightFilterDrawer {
  payload?: Record<string, unknown>;
}

export const InsightFilterDrawer: FC<InsightFilterDrawer> = ({ payload }) => {
  const isDesktop = useDesktopBreakpoint();
  const insightFilters = useInsightFilter({
    adapter: "url",
    defaultValues: payload,
  });

  const { closeDrawer } = useDrawerProvider();

  const handleOnValidSubmit = (data: FilterInsightFormSchema) => {
    const {
      dateRangePreset,
      useCustomDateRange,
      customDateFrom,
      customDateTo,
      customFrequency,
    } = data ?? {};

    if (useCustomDateRange) {
      insightFilters.replaceAll({
        startDate: dayjs(customDateFrom).toISOString(),
        endDate: dayjs(customDateTo).toISOString(),
        frequency: customFrequency,
      });
    } else {
      const { dateFrom, dateTo, frequency } =
        extractDateRangeFromPreset(dateRangePreset);

      insightFilters.replaceAll({
        startDate: dayjs(dateFrom).toISOString(),
        endDate: dayjs(dateTo).toISOString(),
        frequency: frequency,
      });
    }
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Insight Filter</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>

      <Drawer.Body>
        <Form
          defaultValues={convertInsightFilterToFormSchema(
            insightFilters.appliedFilters
          )}
          handleOnValidSubmit={handleOnValidSubmit}
        />
      </Drawer.Body>
      <Drawer.Footer>
        <ButtonGroup alignment="end" fluid={!isDesktop}>
          <Button variant="ghost" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary">
            Apply
          </Button>
        </ButtonGroup>
      </Drawer.Footer>
    </>
  );
};
