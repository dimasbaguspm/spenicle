import type { Account } from '@/api/types'
import { SelectField, TextField } from '@/components/ui/form'
import { isCategoryKind, isMoneyKind } from '@/modules/account'

import type { PayeeFormValues } from './schema'

/**
 * The three fields a payee has. A default is what makes a payee worth naming: pick it once, and
 * the entry that mentions this name fills in the account and the category by itself.
 */
export function PayeeFields({
  accounts,
  emptyLabel,
}: {
  accounts: readonly Account[]
  emptyLabel: string
}) {
  const accountOptions = [
    { label: emptyLabel, value: '' },
    ...accounts
      .filter((account) => isMoneyKind(account.kind))
      .map((account) => ({ label: account.name, value: account.ref })),
  ]

  const categoryOptions = [
    { label: emptyLabel, value: '' },
    ...accounts
      .filter((account) => isCategoryKind(account.kind))
      .map((account) => ({ label: account.name, value: account.ref })),
  ]

  return (
    <>
      <TextField<PayeeFormValues> name="name" label="Name" placeholder="Corner shop" />
      <SelectField<PayeeFormValues>
        name="accountRef"
        label="Default account"
        options={accountOptions}
      />
      <SelectField<PayeeFormValues>
        name="categoryRef"
        label="Default category"
        options={categoryOptions}
      />
    </>
  )
}
