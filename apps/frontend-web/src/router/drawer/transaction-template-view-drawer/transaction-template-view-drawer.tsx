import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { useApiTransactionTemplateQuery } from "@/hooks/use-api";
import { formatTransactionTemplateData } from "@/lib/format-data";
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

interface TransactionTemplateViewDrawerProps {
  transactionTemplateId: number;
}

export const TransactionTemplateViewDrawer: FC<
  TransactionTemplateViewDrawerProps
> = ({ transactionTemplateId }) => {
  const { openDrawer } = useDrawerProvider();
  const { openModal } = useModalProvider();

  const [transactionData, , { isPending: isFetchingTransaction }] =
    useApiTransactionTemplateQuery(transactionTemplateId);

  const isInitialLoading = isFetchingTransaction;

  const {
    note,
    variant,
    capitalizedType,
    amount,
    relatedAccountName,
    relatedDestinationAccountName,
    relatedCategoryName,
  } = formatTransactionTemplateData(transactionData);

  const handleOnEditClick = () => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_RECURRING_UPDATE, {
      transactionTemplateId,
    });
  };

  const handleDeleteClick = () => {
    openModal(MODAL_ROUTES.TRANSACTION_DELETE_CONFIRMATION, {
      transactionTemplateId,
    });
  };

  const handleCategoryClick = () => {
    openDrawer(DRAWER_ROUTES.CATEGORY_VIEW, {
      categoryId: transactionData?.category?.id.toString() || "",
    });
  };

  const handleAccountClick = () => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, {
      accountId: transactionData?.account?.id.toString() || "",
    });
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Transaction Template Details</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isInitialLoading}>
        <PageLoader />
      </When>
      <When condition={!isInitialLoading}>
        <When condition={!transactionData}>
          <Drawer.Body>
            <NoResults
              title="No Transaction Template Found"
              subtitle="The transaction template you are looking for does not exist."
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
              <AttributeList.Item title="Amount">
                <Text>{amount}</Text>
              </AttributeList.Item>
              <AttributeList.Item title="Category">
                <Anchor onClick={handleCategoryClick}>
                  {relatedCategoryName}
                </Anchor>
              </AttributeList.Item>
              <AttributeList.Item title="Source">
                <Anchor onClick={handleAccountClick}>
                  {relatedAccountName}
                </Anchor>
              </AttributeList.Item>
              <When condition={[relatedDestinationAccountName]}>
                <AttributeList.Item title="Destination">
                  <Text>{relatedDestinationAccountName}</Text>
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
