import { PAGE_ROUTES } from "@/constant/page-routes";
import {
  ActionCard,
  Icon,
  PageContent,
  PageHeader,
  PageLayout,
} from "@dimasbaguspm/versaur";
import { TagsIcon, WalletCardsIcon } from "lucide-react";
import { useNavigate } from "react-router";

const SETTINGS_ITEMS = [
  {
    id: "accounts",
    title: "Accounts",
    description: "Manage your expense, income, and investment accounts",
    icon: WalletCardsIcon,
    path: `${PAGE_ROUTES.SETTINGS}/${PAGE_ROUTES.SETTINGS_ACCOUNTS}`,
  },
  {
    id: "categories",
    title: "Categories",
    description: "Organize transactions with custom categories",
    icon: TagsIcon,
    path: `${PAGE_ROUTES.SETTINGS}/${PAGE_ROUTES.SETTINGS_CATEGORIES}`,
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
