export interface TransactionFormRow {
  id: number;
  date: string; // ISO date (YYYY-MM-DD)
  time: string; // HH:mm format
  type: "expense" | "income" | "transfer";
  accountId: number;
  destinationAccountId?: number;
  categoryId: number;
  amount: number;
  note: string;
}

export interface BulkEditFormSchema {
  transactions: TransactionFormRow[];
}
