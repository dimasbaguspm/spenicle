import React, { useState, useMemo, useRef, useEffect } from 'react';

import { Modal } from '../../../../components/modal';
import { cn } from '../../../../libs/utils';
import type { Account } from '../../../../types/api';
import { AccountIcon } from '../account-icon';

interface AccountSelectorModalProps {
  isOpen: boolean;
  accounts: Account[];
  value: Account | null;
  onSelect: (account: Account) => void;
  onClear: () => void;
  onClose: () => void;
  size?: 'sm' | 'md';
}

export const AccountSelectorModal: React.FC<AccountSelectorModalProps> = ({
  isOpen,
  accounts,
  value,
  onSelect,
  onClear,
  onClose,
  size = 'md',
}) => {
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
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
      setFocusedIdx(filteredAccounts.findIndex((acc) => acc.id === value?.id));
    } else {
      setSearch('');
      setFocusedIdx(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredAccounts.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((idx) => (idx + 1) % filteredAccounts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((idx) => (idx - 1 + filteredAccounts.length) % filteredAccounts.length);
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      onSelect(filteredAccounts[focusedIdx]);
    } else if (e.key === 'Tab') {
      setFocusedIdx(-1);
    }
  };

  useEffect(() => {
    if (listRef.current && focusedIdx >= 0) {
      const item = listRef.current.querySelectorAll('button[role="option"]')[focusedIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx, filteredAccounts]);

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} size="sm" closeOnOverlayClick closeOnEscape>
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
          onKeyDown={handleKeyDown}
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
          filteredAccounts.map((account, idx) => (
            <button
              key={account.id}
              type="button"
              role="option"
              aria-selected={value?.id === account.id}
              className={cn(
                'w-full flex items-center gap-3 text-left px-4 py-3 transition-colors',
                value?.id === account.id && 'bg-mist-100 font-semibold',
                focusedIdx === idx
                  ? 'bg-coral-50 z-10'
                  : 'hover:bg-mist-50 active:bg-mist-200 focus:bg-mist-100 focus:outline-none'
              )}
              onClick={() => onSelect(account)}
              onMouseEnter={() => setFocusedIdx(idx)}
            >
              <AccountIcon
                iconValue={account.metadata?.icon}
                colorValue={account.metadata?.color}
                size={size === 'sm' ? 'sm' : 'md'}
              />
              <span className="truncate">{account.name}</span>
            </button>
          ))
        )}
      </div>
      <div className="flex justify-between items-center p-3 border-t border-mist-100 bg-cream-50">
        <div className="text-xs text-slate-500">
          {filteredAccounts.length} of {accounts.length} accounts
        </div>
        <button
          type="button"
          className="text-sm text-slate-400 hover:text-danger-500 focus:text-danger-500 focus:outline-none"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </Modal>
  );
};
