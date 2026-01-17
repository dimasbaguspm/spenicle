import {
  Button,
  ButtonGroup,
  Drawer,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

import { Form, formId } from "./form";
import type { CategoryCreateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiCreateCategory } from "@/hooks/use-api";

export const CategoryCreateDrawer: FC = () => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [createCategory, , { isPending }] = useApiCreateCategory();

  const handleOnValidSubmit = async (data: CategoryCreateFormSchema) => {
    await createCategory({
      name: data.name,
      type: data.type,
      note: data.notes || "",
    });
    showSnack("success", "Category created successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Create Category</Drawer.Title>
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
