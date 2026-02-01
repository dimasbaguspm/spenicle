import { Tabs } from "@dimasbaguspm/versaur";

interface InsightsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const InsightsTabs = ({ activeTab, onTabChange }: InsightsTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
      <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
      <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
    </Tabs>
  );
};
