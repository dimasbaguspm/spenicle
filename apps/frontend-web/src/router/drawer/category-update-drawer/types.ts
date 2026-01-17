export interface CategoryUpdateFormSchema {
  name: string;
  type: "expense" | "income" | "transfer";
  notes: string | undefined;
}
