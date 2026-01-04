import { formatCategoryData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { CategoryModel } from "@/types/schemas";
import {
  Avatar,
  Badge,
  BadgeGroup,
  Card,
  type CardProps,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface CategoryCardProps extends Omit<CardProps, "onClick"> {
  category: CategoryModel;
  onClick?: (category: CategoryModel) => void;
  hideGroup?: boolean;
  hideType?: boolean;
}

export const CategoryCard: FC<CategoryCardProps> = ({
  category,
  onClick,
  hideGroup,
  hideType,
  ...rest
}) => {
  const { variant, name, initialName, type } = formatCategoryData(category);

  const handleClick = () => {
    onClick?.(category);
  };

  return (
    <Card
      onClick={handleClick}
      avatar={<Avatar shape="rounded">{initialName}</Avatar>}
      title={name}
      badge={
        <BadgeGroup>
          <When condition={!hideType}>
            <Badge color={variant}>{type}</Badge>
          </When>
        </BadgeGroup>
      }
      {...rest}
    />
  );
};
