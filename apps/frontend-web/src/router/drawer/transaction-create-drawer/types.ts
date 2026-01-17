export interface TransactionCreateFormSchema {
  type: "expense" | "income" | "transfer";
  date: string;
  time: string;
  accountId: number;
  destinationAccountId: number | undefined;
  categoryId: number;
  amount: number;
  notes: string;
}
