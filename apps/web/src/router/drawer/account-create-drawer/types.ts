export interface AccountCreateFormSchema {
  name: string;
  type: "income" | "expense";
  notes: string | undefined;
}
