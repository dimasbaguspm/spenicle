import { MODAL_ROUTES } from "@/constant/modal-routes";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { nameToInitials } from "@/lib/name-to-initial";
import { useModalProvider } from "@/providers/modal-provider";
import {
  Avatar,
  BottomSheet,
  Button,
  Hr,
  Icon,
  Text,
} from "@dimasbaguspm/versaur";
import { BoltIcon, LogOutIcon } from "lucide-react";

import { useNavigate } from "react-router";

export const MenuBottomSheet = () => {
  const { openModal } = useModalProvider();

  const navigate = useNavigate();

  const curriedNavigate = (path: string) => () => navigate(path);

  const handleOnLogoutClick = () => {
    openModal(MODAL_ROUTES.LOGOUT_CONFIRMATION);
  };

  return (
    <>
      <BottomSheet.Header />
      <BottomSheet.Body>
        <div className="flex justify-start items-center mb-4">
          <Avatar shape="rounded" size="lg">
            {nameToInitials("Dimas M")}
          </Avatar>
          <div className="ml-4 flex flex-col">
            <Text fontWeight="medium">Dimas M</Text>
          </div>
        </div>

        <ul className="flex flex-col gap-1">
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={curriedNavigate(DEEP_PAGE_LINKS.SETTINGS.path)}
            >
              <Icon as={BoltIcon} size="sm" color="inherit" />
              Settings
            </Button>
          </li>
          <li>
            <Hr />
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleOnLogoutClick}
            >
              <Icon as={LogOutIcon} size="sm" color="inherit" />
              Logout
            </Button>
          </li>
          <li>
            <Hr />
          </li>
        </ul>
      </BottomSheet.Body>
      <BottomSheet.Footer className="mx-auto">
        <Text as="small" color="gray">
          Version {import.meta.env.VITE_WEB_APP_VERSION}
        </Text>
      </BottomSheet.Footer>
    </>
  );
};
