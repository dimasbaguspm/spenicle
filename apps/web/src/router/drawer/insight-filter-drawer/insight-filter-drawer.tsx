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

interface InsightFilterDrawer {
  payload?: Record<string, unknown>;
}

export const InsightFilterDrawer: FC<InsightFilterDrawer> = ({ payload }) => {
  const isDesktop = useDesktopBreakpoint();
  const insightFilters = useInsightFilter({
    adapter: "url",
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

    const { dateFrom, dateTo, frequency } =
      extractDateRangeFromPreset(dateRangePreset);

    if (useCustomDateRange) {
      insightFilters.replaceAll({
        startDate: customDateFrom,
        endDate: customDateTo,
        frequency: customFrequency,
      });
    } else {
      insightFilters.replaceAll({
        startDate: dateFrom,
        endDate: dateTo,
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
