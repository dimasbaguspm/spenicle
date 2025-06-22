import { Check } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

import { Button } from '../../../../components';
import { Modal } from '../../../../components/modal';
import { useViewport } from '../../../../hooks';
import { cn } from '../../../../libs/utils';
import type { Account } from '../../../../types/api';
import { AccountIcon } from '../account-icon';

interface AccountSelectorSingleModalProps {
  isOpen: boolean;
  accounts: Account[];
  value: Account | null;
  onSubmit: (account: Account) => void;
  onClear: () => void;
  onClose: () => void;
}

export const AccountSelectorSingleModal: React.FC<AccountSelectorSingleModalProps> = ({
  isOpen,
  accounts,
  value,
  onSubmit,
  onClear,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(
    typeof value?.id === 'number' ? value.id : undefined
  );
  const { isDesktop } = useViewport();
  const size = isDesktop ? 'lg' : 'sm';
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((acc) => (acc.name ?? '').toLowerCase().includes(term));
  }, [accounts, search]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSelectedId(typeof value?.id === 'number' ? value.id : undefined);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const handleAccountClick = (account: Account) => {
    if (typeof account.id !== 'number') return;
    setSelectedId((prev) => (prev === account.id ? undefined : account.id));
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} size={size} closeOnOverlayClick closeOnEscape>
      <Modal.Header>
        <Modal.Title>Select Account</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <div className="p-3 border-b border-mist-100 bg-cream-50">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts..."
          className="w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-coral-400 outline-none transition"
          aria-label="Search accounts"
          aria-autocomplete="list"
          aria-controls="account-listbox"
        />
      </div>
      <div
        ref={listRef}
        id="account-listbox"
        role="listbox"
        className="bg-white max-h-80 overflow-y-auto divide-y divide-mist-100"
      >
        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No accounts found</div>
        ) : (
          filteredAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              role="option"
              aria-selected={typeof account.id === 'number' && selectedId === account.id}
              className={cn(
                'w-full flex items-center gap-3 text-left px-4 py-3 transition-colors',
                typeof account.id === 'number' && selectedId === account.id && 'bg-mist-100 font-semibold',
                'hover:bg-mist-50 active:bg-mist-200 focus:bg-mist-100 focus:outline-none'
              )}
              onClick={() => handleAccountClick(account)}
            >
              <AccountIcon
                iconValue={account.metadata?.icon}
                colorValue={account.metadata?.color}
                size={size === 'sm' ? 'sm' : 'md'}
              />
              <span className="truncate">{account.name}</span>
              {typeof account.id === 'number' && selectedId === account.id ? (
                <span className="ml-auto text-coral-600 font-bold flex items-center">
                  <Check className="w-5 h-5" aria-label="Selected" />
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
      <div className="flex justify-between items-center p-3 border-t border-mist-100 bg-cream-50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filteredAccounts.length} of {accounts.length} accounts
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-danger-500 focus:text-danger-500 focus:outline-none"
            onClick={() => {
              setSelectedId(undefined);
              onClear();
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="coral"
            size="sm"
            className="ml-2"
            disabled={selectedId === undefined}
            onClick={() => {
              if (selectedId === undefined) return;
              const selected = accounts.find((acc) => typeof acc.id === 'number' && selectedId === acc.id);
              if (selected) onSubmit(selected);
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
