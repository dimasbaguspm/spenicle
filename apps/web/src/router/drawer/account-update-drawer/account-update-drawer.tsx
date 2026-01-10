import {
  Button,
  ButtonGroup,
  Drawer,
  NoResults,
  PageLoader,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

import { Form, formId } from "./form";
import type { AccountUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiAccountQuery, useApiUpdateAccount } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { SearchXIcon } from "lucide-react";

interface AccountUpdateDrawerProps {
  accountId: number;
}

export const AccountUpdateDrawer: FC<AccountUpdateDrawerProps> = ({
  accountId,
}) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [accountData, , { isPending: isAccountLoading }] =
    useApiAccountQuery(accountId);
  const [updateAccount, , { isPending }] = useApiUpdateAccount();

  const handleOnValidSubmit = async (data: AccountUpdateFormSchema) => {
    await updateAccount({
      id: accountId,
      name: data.name,
      type: data.type,
      note: data.notes || "",
    });
    showSnack("success", "Account updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update Account</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isAccountLoading}>
        <Drawer.Body>
          <PageLoader />
        </Drawer.Body>
      </When>
      <When condition={!isAccountLoading}>
        <When condition={!accountData}>
          <NoResults
            title="Account not found"
            subtitle="The account you are trying to update does not exist."
            icon={SearchXIcon}
          />
        </When>
        <When condition={!!accountData}>
          <Drawer.Body>
            <Form
              handleOnValidSubmit={handleOnValidSubmit}
              defaultValues={{
                name: accountData?.name,
                type: accountData?.type,
                notes: accountData?.note,
              }}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <ButtonGroup alignment="end" fluid={!isDesktop}>
              <Button variant="ghost" onClick={closeDrawer}>
                Cancel
              </Button>
              <Button type="submit" form={formId} disabled={isPending}>
                Update
              </Button>
            </ButtonGroup>
          </Drawer.Footer>
        </When>
      </When>
    </>
  );
};
