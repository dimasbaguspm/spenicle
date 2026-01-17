import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { TransactionModel } from "@/types/schemas";
import { TransactionCard } from "@/ui/transaction-card/transaction-card";
import {
  Button,
  ButtonGroup,
  Hr,
  Icon,
  NoResults,
} from "@dimasbaguspm/versaur";
import { ArrowRightIcon, SearchXIcon } from "lucide-react";
import { useNavigate } from "react-router";

interface RecentTransactionsProps {
  transactions: TransactionModel[];
}

export const RecentTransactions = ({
  transactions,
}: RecentTransactionsProps) => {
  const navigate = useNavigate();
  const { openDrawer } = useDrawerProvider();

  const handleOnMoreClick = () => {
    navigate(DEEP_PAGE_LINKS.TRANSACTIONS_ALT.path);
  };

  const handleOnStartTrackingClick = () => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_CREATE);
  };

  const handleOnTransactionClick = (transaction: TransactionModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_VIEW, {
      transactionId: transaction.id,
    });
  };

  return (
    <div className="mt-4">
      {transactions.length > 0 ? (
        <>
          <ul className="mb-4">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <TransactionCard
                  transaction={transaction}
                  onClick={() => handleOnTransactionClick(transaction)}
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
        </>
      ) : (
        <NoResults
          icon={SearchXIcon}
          title="No transactions yet"
          subtitle="Start tracking your finances"
          action={
            <Button variant="outline" onClick={handleOnStartTrackingClick}>
              Start Tracking
            </Button>
          }
        />
      )}
    </div>
  );
};
