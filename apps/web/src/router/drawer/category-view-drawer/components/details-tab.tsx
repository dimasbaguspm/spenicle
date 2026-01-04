import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { formatCategoryData } from "@/lib/format-data";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import type { CategoryModel } from "@/types/schemas";
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
  data: CategoryModel;
}

export const DetailsTab: FC<DetailsTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();
  const { openModal } = useModalProvider();

  const { variant, type, note } = formatCategoryData(data);

  const handleEditClick = () => {
    openDrawer(DRAWER_ROUTES.CATEGORY_UPDATE, { categoryId: data.id });
  };

  const handleDeleteClick = () => {
    openModal(MODAL_ROUTES.CATEGORY_DELETE_CONFIRMATION, {
      categoryId: data.id,
    });
  };

  return (
    <>
      <ButtonGroup className="mb-4">
        <Button variant="outline" onClick={handleEditClick}>
          <Icon as={EditIcon} color="inherit" size="sm" />
          Edit
        </Button>

        <ButtonIcon
          as={TrashIcon}
          onClick={handleDeleteClick}
          className="ml-auto"
          variant="outline"
          aria-label="Delete category"
        />
      </ButtonGroup>

      <BadgeGroup className="mb-4">
        <Badge color={variant}>{type}</Badge>
      </BadgeGroup>

      <When condition={[note]}>
        <AttributeList className="mb-4">
          <When condition={note}>
            <AttributeList.Item title="Notes" span={12}>
              {note}
            </AttributeList.Item>
          </When>
        </AttributeList>
      </When>
    </>
  );
};
