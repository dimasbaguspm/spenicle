import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { Button, ButtonIcon, Icon, PageHeader } from "@dimasbaguspm/versaur";
import { FilterIcon } from "lucide-react";

export const InsightsHeader = () => {
  const { openDrawer } = useDrawerProvider();

  const handleOpenFilterDrawer = () => {
    openDrawer(DRAWER_ROUTES.INSIGHTS_FILTER);
  };

  return (
    <PageHeader
      title="Insights"
      size="wide"
      actions={
        <Button variant="outline" onClick={handleOpenFilterDrawer}>
          <Icon as={FilterIcon} color="inherit" size="sm" />
          Filter
        </Button>
      }
      mobileActions={
        <ButtonIcon
          as={FilterIcon}
          variant="outline"
          aria-label="Filter"
          onClick={handleOpenFilterDrawer}
        />
      }
    />
  );
};
