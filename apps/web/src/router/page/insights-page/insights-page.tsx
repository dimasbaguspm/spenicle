import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { DEEP_PAGE_LINKS, PAGE_ROUTES } from "@/constant/page-routes";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  Button,
  ButtonIcon,
  Icon,
  PageContent,
  PageHeader,
  PageLayout,
  PageLoader,
  Tabs,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import { FilterIcon } from "lucide-react";
import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

const InsightsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openDrawer } = useDrawerProvider();

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes(PAGE_ROUTES.INSIGHTS_ACCOUNTS)) return "accounts";
    if (path.includes(PAGE_ROUTES.INSIGHTS_CATEGORIES)) return "categories";
    return "overview";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    switch (value) {
      case "overview":
        navigate({
          pathname: PAGE_ROUTES.INSIGHTS,
          search: location.search,
        });
        break;
      case "accounts":
        navigate({
          pathname: PAGE_ROUTES.INSIGHTS_ACCOUNTS,
          search: location.search,
        });
        break;
      case "categories":
        navigate({
          pathname: PAGE_ROUTES.INSIGHTS_CATEGORIES,
          search: location.search,
        });
        break;
    }
  };

  const handleOpenFilterDrawer = () => {
    openDrawer(DRAWER_ROUTES.INSIGHTS_FILTER);
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Insights"
          size="wide"
          tabs={
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
              <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
            </Tabs>
          }
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
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default InsightsPage;
