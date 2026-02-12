import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";

const InsightsMapPage = () => {
  const isMobile = useMobileBreakpoint();

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      <div>Insights Map Page - to be implemented</div>
    </PageContent>
  );
};

export default InsightsMapPage;
