import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { useApiAccountQuery, useApiCategoryQuery } from "@/hooks/use-api";
import { useApiTransactionQuery } from "@/hooks/use-api/built/transactions";
import {
  formatAccountData,
  formatCategoryData,
  formatTransactionData,
} from "@/lib/format-data";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import {
  Anchor,
  AttributeList,
  Badge,
  BadgeGroup,
  Button,
  ButtonGroup,
  ButtonIcon,
  Drawer,
  Icon,
  NoResults,
  PageLoader,
  Text,
} from "@dimasbaguspm/versaur";
import { Edit2Icon, SearchXIcon, TrashIcon } from "lucide-react";
import type { FC } from "react";

interface TransactionViewDrawerProps {
  transactionId: number;
}

export const TransactionViewDrawer: FC<TransactionViewDrawerProps> = ({
  transactionId,
}) => {
  const { openDrawer } = useDrawerProvider();
  const { openModal } = useModalProvider();

  const [transactionData, , { isPending: isFetchingTransaction }] =
    useApiTransactionQuery(transactionId);

  const [accountData, , { isPending: isFetchingAccount }] = useApiAccountQuery(
    transactionData?.accountId || 0,
    {
      enabled: !!transactionData?.accountId,
    }
  );
  const [
    destinationAccountData,
    ,
    { isPending: isFetchingDestinationAccount },
  ] = useApiAccountQuery(transactionData?.destinationAccountId || 0, {
    enabled: !!transactionData?.destinationAccountId,
  });
  const [categoryData, , { isPending: isFetchingCategory }] =
    useApiCategoryQuery(transactionData?.categoryId || 0, {
      enabled: !!transactionData?.categoryId,
    });

  const isInitialLoading =
    isFetchingTransaction ||
    isFetchingAccount ||
    isFetchingDestinationAccount ||
    isFetchingCategory;

  const { note, variant, capitalizedType, date, time, amount } =
    formatTransactionData(transactionData);

  const { name: accountName } = formatAccountData(accountData);
  const { name: destinationAccountName } = formatAccountData(
    destinationAccountData
  );
  const { name: categoryName } = formatCategoryData(categoryData);

  const handleOnEditClick = () => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_UPDATE, {
      transactionId,
    });
  };

  const handleDeleteClick = () => {
    openModal(MODAL_ROUTES.TRANSACTION_DELETE_CONFIRMATION, {
      transactionId,
    });
  };

  const handleCategoryClick = () => {
    openDrawer(DRAWER_ROUTES.CATEGORY_VIEW, {
      categoryId: categoryData?.id.toString() || "",
    });
  };

  const handleAccountClick = () => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, {
      accountId: accountData?.id.toString() || "",
    });
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Transaction Details</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isInitialLoading}>
        <PageLoader />
      </When>
      <When condition={!isInitialLoading}>
        <When condition={!transactionData}>
          <Drawer.Body>
            <NoResults
              title="No Transaction Found"
              subtitle="The transaction you are looking does not exist."
              icon={SearchXIcon}
            />
          </Drawer.Body>
        </When>
        <When condition={!!transactionData}>
          <Drawer.Body>
            <ButtonGroup hasMargin>
              <Button variant="outline" onClick={handleOnEditClick}>
                <Icon as={Edit2Icon} size="sm" color="inherit" />
                Edit
              </Button>

              <ButtonIcon
                as={TrashIcon}
                onClick={handleDeleteClick}
                className="ml-auto"
                variant="outline"
                aria-label="Delete transaction"
              />
            </ButtonGroup>

            <BadgeGroup hasMargin>
              <Badge color={variant}>{capitalizedType}</Badge>
            </BadgeGroup>

            <AttributeList className="mb-4" columns={2}>
              <AttributeList.Item title="Time">
                <Text>{time}</Text>
              </AttributeList.Item>
              <AttributeList.Item title="Date">
                <Text>{date}</Text>
              </AttributeList.Item>
              <AttributeList.Item title="Amount">
                <Text>{amount}</Text>
              </AttributeList.Item>
              <AttributeList.Item title="Category">
                <Anchor onClick={handleCategoryClick}>{categoryName}</Anchor>
              </AttributeList.Item>
              <AttributeList.Item title="Source">
                <Anchor onClick={handleAccountClick}>{accountName}</Anchor>
              </AttributeList.Item>
              <When condition={[destinationAccountName]}>
                <AttributeList.Item title="Destination">
                  <Text>{destinationAccountName}</Text>
                </AttributeList.Item>
              </When>
              <When condition={[note]}>
                <AttributeList.Item title="Notes" span={2}>
                  <Text>{note}</Text>
                </AttributeList.Item>
              </When>
            </AttributeList>
          </Drawer.Body>
        </When>
      </When>
    </>
  );
};
