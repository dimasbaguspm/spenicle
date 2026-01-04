import { BOTTOM_SHEET_ROUTES } from "@/constant/bottom-sheet-routes";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";
import { BottomBar, Icon } from "@dimasbaguspm/versaur";
import { Settings2Icon } from "lucide-react";
import { useNavigate } from "react-router";

const BOTTOM_BAR_LINKS = [
  DEEP_PAGE_LINKS.DASHBOARD,
  DEEP_PAGE_LINKS.TRANSACTIONS_ALT,
  DEEP_PAGE_LINKS.INSIGHTS,
];

export const AppBottomBar = () => {
  const navigate = useNavigate();
  const { openBottomSheet } = useBottomSheetProvider();

  const handleNavigation = (path: string) => () => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <BottomBar>
      {BOTTOM_BAR_LINKS.map((link) => {
        const isActiveLink =
          link.path === DEEP_PAGE_LINKS.TRANSACTIONS_ALT.path
            ? location.pathname.startsWith(
                DEEP_PAGE_LINKS.TRANSACTIONS_ALT.path
              )
            : link.path === DEEP_PAGE_LINKS.DASHBOARD.path
            ? location.pathname === DEEP_PAGE_LINKS.DASHBOARD.path
            : isActive(link.path);
        return (
          <BottomBar.Item
            key={link.path}
            className="h-16"
            icon={
              <Icon
                as={link.icon}
                size="md"
                color={isActiveLink ? "primary" : "inherit"}
              />
            }
            onClick={handleNavigation(link.path)}
            active={isActiveLink}
          />
        );
      })}

      <BottomBar.Item onClick={() => openBottomSheet(BOTTOM_SHEET_ROUTES.MENU)}>
        <Icon
          as={Settings2Icon}
          size="md"
          color={
            isActive(DEEP_PAGE_LINKS.SETTINGS.path) ? "primary" : "inherit"
          }
        />
      </BottomBar.Item>
    </BottomBar>
  );
};
