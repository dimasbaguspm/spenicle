import { nameToInitials } from "@/lib/name-to-initial";
import {
  Avatar,
  Brand,
  ButtonMenuIcon,
  Hr,
  Icon,
  Text,
  TopBar,
} from "@dimasbaguspm/versaur";
import { type FC } from "react";
import { useLocation, useNavigate } from "react-router";

import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { BoltIcon, LogOutIcon, Settings2Icon } from "lucide-react";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { useModalProvider } from "@/providers/modal-provider";

const TOP_BAR_LINKS = [
  DEEP_PAGE_LINKS.TRANSACTIONS_ALT,
  DEEP_PAGE_LINKS.INSIGHTS,
];

export const AppTopBar: FC = () => {
  const location = useLocation();
  const { openModal } = useModalProvider();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <TopBar>
      <TopBar.Leading>
        <Brand
          name="spenicle"
          size="lg"
          shape="rounded"
          aria-label="Spenicle"
          className="cursor-pointer"
          onClick={() => navigate(DEEP_PAGE_LINKS.DASHBOARD.path)}
        />
        <TopBar.Nav>
          {TOP_BAR_LINKS.map((link) => {
            const isActiveLink = isActive(link.path);

            const isTransactionPageActive = location.pathname.startsWith(
              DEEP_PAGE_LINKS.TRANSACTIONS_ALT.path
            );

            return (
              <TopBar.NavItem
                key={link.path}
                active={
                  link.path === DEEP_PAGE_LINKS.TRANSACTIONS_ALT.path
                    ? isTransactionPageActive
                    : isActiveLink
                }
                onClick={() => navigate(link.path)}
              >
                {link.title}
              </TopBar.NavItem>
            );
          })}
        </TopBar.Nav>
      </TopBar.Leading>
      <TopBar.Trailing>
        <Avatar size="md">{nameToInitials("Dimas M")}</Avatar>
        <ButtonMenuIcon
          variant="ghost"
          aria-label="Profile Menu"
          as={Settings2Icon}
        >
          <ButtonMenuIcon.Item
            onClick={() => navigate(DEEP_PAGE_LINKS.SETTINGS.path)}
          >
            <Icon as={BoltIcon} size="sm" color="inherit" />
            Settings
          </ButtonMenuIcon.Item>
          <Hr />
          <ButtonMenuIcon.Item
            onClick={() => openModal(MODAL_ROUTES.LOGOUT_CONFIRMATION)}
          >
            <Icon as={LogOutIcon} size="sm" color="inherit" />
            Logout
          </ButtonMenuIcon.Item>
          <Hr />
          <Text as="small" color="gray" align="center">
            Version 1.0.0
          </Text>
        </ButtonMenuIcon>
      </TopBar.Trailing>
    </TopBar>
  );
};
