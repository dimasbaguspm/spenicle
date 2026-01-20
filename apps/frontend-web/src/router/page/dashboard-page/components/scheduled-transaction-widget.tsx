import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { useApiTransactionTemplatesPaginatedQuery } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { TransactionTemplateModel } from "@/types/schemas";
import { TransactionTemplateCard } from "@/ui/transaction-template-card";
import {
  Button,
  ButtonGroup,
  Hr,
  Icon,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { ArrowRightIcon, SearchXIcon } from "lucide-react";
import { useNavigate } from "react-router";

export const ScheduledTransactionsWidget = () => {
  const navigate = useNavigate();
  const { openDrawer } = useDrawerProvider();

  const [templates, , { isPending }] = useApiTransactionTemplatesPaginatedQuery(
    {
      sortBy: "nextDueAt",
      sortOrder: "asc",
    },
  );

  const handleOnMoreClick = () => {
    navigate(DEEP_PAGE_LINKS.SETTINGS_SUBSCRIPTIONS.path);
  };

  const handleOnStartSchedulingClick = () => {
    navigate(DEEP_PAGE_LINKS.SETTINGS_SUBSCRIPTIONS.path);
  };

  const handleOnTransactionClick = (template: TransactionTemplateModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_TEMPLATE_VIEW, {
      transactionTemplateId: template.id,
    });
  };

  return (
    <div className="mt-4">
      <When condition={isPending}>
        <PageLoader />
      </When>
      <When condition={!isPending}>
        <When condition={templates?.items?.length === 0}>
          <NoResults
            icon={SearchXIcon}
            title="No scheduled transactions yet"
            subtitle="Start scheduling your transactions"
            action={
              <Button variant="outline" onClick={handleOnStartSchedulingClick}>
                Start Scheduling
              </Button>
            }
          />
        </When>
        <When condition={templates?.items?.length! > 0}>
          <ul className="mb-4">
            {templates?.items?.map((transactionTemplate) => (
              <li key={transactionTemplate.id}>
                <TransactionTemplateCard
                  transactionTemplate={transactionTemplate}
                  onClick={() => handleOnTransactionClick(transactionTemplate)}
                  useDateTime
                />
                <Hr />
              </li>
            ))}
          </ul>
          <ButtonGroup alignment="end">
            <Button variant="ghost" size="sm" onClick={handleOnMoreClick}>
              More <Icon as={ArrowRightIcon} color="inherit" size="sm" />
            </Button>
          </ButtonGroup>
        </When>
      </When>
    </div>
  );
};
