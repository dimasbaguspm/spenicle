import { formatAccountData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { AccountModel } from "@/types/schemas";
import {
  Avatar,
  Badge,
  BadgeGroup,
  Card,
  type CardProps,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface AccountCardProps extends Omit<CardProps, "onClick"> {
  account: AccountModel;
  onClick?: (account: AccountModel) => void;
  hideType?: boolean;
  hideGroup?: boolean;
  hideAmount?: boolean;
}

export const AccountCard: FC<AccountCardProps> = (props) => {
  const { account, onClick, hideGroup, hideAmount, hideType, ...rest } = props;
  const { formattedAmount, name, initialName, type, variant } =
    formatAccountData(account);

  const handleClick = () => {
    onClick?.(account);
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
      supplementaryInfo={hideAmount ? undefined : formattedAmount}
      {...rest}
    />
  );
};
