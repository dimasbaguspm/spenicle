import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { formatAccountData } from "@/lib/format-data";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import type { AccountModel } from "@/types/schemas";
import {
  AttributeList,
  Badge,
  BadgeGroup,
  Button,
  ButtonGroup,
  ButtonIcon,
  Icon,
} from "@dimasbaguspm/versaur";
import { EditIcon, TrashIcon } from "lucide-react";
import type { FC } from "react";

interface DetailsTabProps {
  data: AccountModel;
}

export const DetailsTab: FC<DetailsTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();
  const { openModal } = useModalProvider();
  const { type, isExpense, formattedAmount, notes } = formatAccountData(data);

  const handleEditClick = () => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_UPDATE, { accountId: data.id });
  };

  const handleDeleteClick = () => {
    openModal(MODAL_ROUTES.ACCOUNT_DELETE_CONFIRMATION, { accountId: data.id });
  };

  return (
    <>
      <ButtonGroup hasMargin>
        <Button variant="outline" onClick={handleEditClick}>
          <Icon as={EditIcon} color="inherit" size="sm" />
          Edit
        </Button>
        <ButtonIcon
          as={TrashIcon}
          onClick={handleDeleteClick}
          className="ml-auto"
          variant="outline"
          aria-label="Delete account"
        />
      </ButtonGroup>

      <BadgeGroup className="mb-4">
        <Badge color={isExpense ? "primary" : "secondary"} size="md">
          {type}
        </Badge>
      </BadgeGroup>

      <AttributeList columns={1} className="mb-4">
        <AttributeList.Item title="Amount">
          {formattedAmount}
        </AttributeList.Item>

        <When condition={notes}>
          <AttributeList.Item title="Notes">{notes}</AttributeList.Item>
        </When>
      </AttributeList>
    </>
  );
};
