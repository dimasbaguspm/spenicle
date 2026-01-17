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
import type { CategoryUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiCategoryQuery, useApiUpdateCategory } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { SearchXIcon } from "lucide-react";

interface CategoryUpdateDrawerProps {
  categoryId: number;
}

export const CategoryUpdateDrawer: FC<CategoryUpdateDrawerProps> = ({
  categoryId,
}) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [categoryData, , { isPending: isCategoryLoading }] =
    useApiCategoryQuery(categoryId);
  const [updateCategory, , { isPending }] = useApiUpdateCategory();

  const handleOnValidSubmit = async (data: CategoryUpdateFormSchema) => {
    await updateCategory({
      id: categoryId,
      name: data.name,
      type: data.type,
      note: data.notes || "",
    });
    showSnack("success", "Category updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update Category</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isCategoryLoading}>
        <Drawer.Body>
          <PageLoader />
        </Drawer.Body>
      </When>
      <When condition={!isCategoryLoading}>
        <When condition={!categoryData}>
          <Drawer.Body>
            <NoResults
              title="No Category Found"
              subtitle="The category you are looking does not exist."
              icon={SearchXIcon}
            />
          </Drawer.Body>
        </When>
        <When condition={!!categoryData}>
          <Drawer.Body>
            <Form
              handleOnValidSubmit={handleOnValidSubmit}
              defaultValues={{
                name: categoryData?.name,
                type: categoryData?.type,
                notes: categoryData?.note,
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
