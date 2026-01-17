import {
  Button,
  ButtonGroup,
  Drawer,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

import { Form, formId } from "./form";
import type { AccountCreateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiCreateAccount } from "@/hooks/use-api";

export const AccountCreateDrawer: FC = () => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [createAccount, , { isPending }] = useApiCreateAccount();

  const handleOnValidSubmit = async (data: AccountCreateFormSchema) => {
    await createAccount({
      name: data.name,
      type: data.type,
      note: data.notes || "",
    });
    showSnack("success", "Account created successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Create Account</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Body>
        <Form
          handleOnValidSubmit={handleOnValidSubmit}
          defaultValues={{
            name: "",
            type: "expense",
            notes: "",
          }}
        />
      </Drawer.Body>
      <Drawer.Footer>
        <ButtonGroup alignment="end" fluid={!isDesktop}>
          <Button variant="ghost" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            Create
          </Button>
        </ButtonGroup>
      </Drawer.Footer>
    </>
  );
};
