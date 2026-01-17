export interface AccountUpdateFormSchema {
  name: string;
  type: "income" | "expense";
  notes: string | undefined;
}
