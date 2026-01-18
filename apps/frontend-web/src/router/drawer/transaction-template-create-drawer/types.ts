export interface TransactionTemplateCreateFormSchema {
  type: "expense" | "income" | "transfer";
  accountId: number;
  destinationAccountId: number | undefined;
  categoryId: number;
  amount: number;
  notes: string;
  name: string;
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate: string | undefined;
}
