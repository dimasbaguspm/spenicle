import { nameToInitials } from "@/lib/name-to-initial";
import { Avatar, Brand, TopBar } from "@dimasbaguspm/versaur";
import { type FC } from "react";
import { useLocation, useNavigate } from "react-router";

import { DEEP_PAGE_LINKS } from "@/constant/page-routes";

const TOP_BAR_LINKS = [
  DEEP_PAGE_LINKS.TRANSACTIONS_ALT,
  DEEP_PAGE_LINKS.ACCOUNTS,
  DEEP_PAGE_LINKS.CATEGORIES,
  DEEP_PAGE_LINKS.SUMMARY,
];

export const AppTopBar: FC = () => {
  const location = useLocation();

  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <TopBar>
      <TopBar.Leading>
        <Brand
          name="spenicle"
          size="lg"
          shape="rounded"
          aria-label="Spenicle Logo"
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
      </TopBar.Trailing>
    </TopBar>
  );
};
