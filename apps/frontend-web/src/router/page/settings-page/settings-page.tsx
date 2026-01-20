import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import {
  ActionCard,
  Icon,
  PageContent,
  PageHeader,
  PageLayout,
} from "@dimasbaguspm/versaur";
import { useNavigate } from "react-router";

const SETTINGS_ITEMS = [
  {
    id: "accounts",
    description: "Manage your expense, income, and investment accounts",
    ...DEEP_PAGE_LINKS.SETTINGS_ACCOUNTS,
  },
  {
    id: "categories",
    description: "Organize transactions with custom categories",
    ...DEEP_PAGE_LINKS.SETTINGS_CATEGORIES,
  },
  {
    id: "subscriptions",
    description: "Manage your recurring and installment transactions",
    ...DEEP_PAGE_LINKS.SETTINGS_SUBSCRIPTIONS,
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Settings"
          subtitle="Configure your financial tracking preferences"
          size="wide"
        />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <PageContent size="wide">
          <ActionCard.Group>
            {SETTINGS_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <ActionCard
                  as="button"
                  key={item.id}
                  title={item.title}
                  subtitle={item.description}
                  showArrow
                  onClick={() => navigate(item.path)}
                  icon={<Icon as={IconComponent} color="inherit" />}
                />
              );
            })}
          </ActionCard.Group>
        </PageContent>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default SettingsPage;
