export interface CategoryCreateFormSchema {
  name: string;
  type: "expense" | "income" | "transfer";
  notes: string | undefined;
}
