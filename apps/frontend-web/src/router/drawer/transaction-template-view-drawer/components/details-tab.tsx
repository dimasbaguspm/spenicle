import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { formatTransactionTemplateData } from "@/lib/format-data";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import { TransactionTemplateModel } from "@/types/schemas";
import {
  Anchor,
  AttributeList,
  Badge,
  BadgeGroup,
  Button,
  ButtonGroup,
  ButtonIcon,
  Icon,
  Text,
} from "@dimasbaguspm/versaur";
import { Edit2Icon, TrashIcon } from "lucide-react";
import { FC } from "react";

interface DetailsTabProps {
  data: TransactionTemplateModel;
}

export const DetailsTab: FC<DetailsTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();
  const { openModal } = useModalProvider();

  const {
    note,
    variant,
    capitalizedType,
    amount,
    relatedAccountName,
    relatedDestinationAccountName,
    relatedCategoryName,
  } = formatTransactionTemplateData(data);

  const handleOnEditClick = () => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_RECURRING_UPDATE, {
      transactionTemplateId: data.id,
    });
  };

  const handleDeleteClick = () => {
    openModal(MODAL_ROUTES.TRANSACTION_DELETE_CONFIRMATION, {
      transactionTemplateId: data.id,
    });
  };

  const handleCategoryClick = () => {
    openDrawer(DRAWER_ROUTES.CATEGORY_VIEW, {
      categoryId: data?.category?.id.toString() || "",
    });
  };

  const handleAccountClick = () => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, {
      accountId: data?.account?.id.toString() || "",
    });
  };

  return (
    <>
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
          <Anchor onClick={handleCategoryClick}>{relatedCategoryName}</Anchor>
        </AttributeList.Item>
        <AttributeList.Item title="Source">
          <Anchor onClick={handleAccountClick}>{relatedAccountName}</Anchor>
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
    </>
  );
};
