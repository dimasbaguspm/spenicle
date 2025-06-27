import React, { useState, useEffect } from 'react';

import { Modal } from '../../modal';
import { Numpad } from '../../numpad';
import { safeEvaluateExpression, sanitizeNumericInput } from '../helpers';
import type { AmountFieldCalculatorModalProps, CalculatorInputType } from '../types';

export const AmountFieldCalculatorModal: React.FC<AmountFieldCalculatorModalProps> = ({
  isOpen,
  initialValue,
  onSubmit,
  onClose,
}) => {
  const [calcValue, setCalcValue] = useState<string>(initialValue);
  const [calcExpr, setCalcExpr] = useState<string>('');
  const [lastInput, setLastInput] = useState<CalculatorInputType>(null);

  // reset calculator state when modal opens
  useEffect(() => {
    if (isOpen) {
      const sanitizedValue = sanitizeNumericInput(initialValue);
      setCalcValue(sanitizedValue || '0');
      setCalcExpr('');
      setLastInput(null);
    }
  }, [isOpen, initialValue]);

  const handleNumpadNumber = (num: string): void => {
    // sanitize input for security
    const sanitizedNum = sanitizeNumericInput(num);

    if (lastInput === 'equals') {
      setCalcExpr(sanitizedNum);
      setCalcValue(sanitizedNum);
    } else {
      setCalcExpr((prev) => prev + sanitizedNum);
      setCalcValue((prev) => (prev === '0' ? sanitizedNum : prev + sanitizedNum));
    }
    setLastInput('number');
  };

  const handleNumpadOperator = (op: string): void => {
    if (op === '=') {
      const result = safeEvaluateExpression(calcExpr, calcValue);
      setCalcValue(result);
      setCalcExpr(result);
      setLastInput('equals');
    } else {
      // validate operator for security
      const validOperators = ['+', '-', '*', '/'];
      if (!validOperators.includes(op)) {
        return;
      }

      if (lastInput === 'operator') {
        setCalcExpr((prev) => prev.slice(0, -1) + op);
      } else if (lastInput === 'equals') {
        setCalcExpr(calcValue + op);
      } else {
        setCalcExpr((prev) => prev + op);
      }
      setCalcValue('');
      setLastInput('operator');
    }
  };

  const handleNumpadBackspace = (): void => {
    if (lastInput === 'equals') {
      setCalcExpr('');
      setCalcValue('0');
      setLastInput(null);
    } else {
      setCalcExpr((prev) => prev.slice(0, -1));
      setCalcValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    }
  };

  const handleNumpadClear = (): void => {
    setCalcExpr('');
    setCalcValue('0');
    setLastInput(null);
  };

  const handleNumpadEnter = (): void => {
    const sanitizedValue = sanitizeNumericInput(calcValue);
    const parsed = parseFloat(sanitizedValue);

    // validate result before submission
    if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
      onSubmit(parsed);
    }
    onClose();
  };

  return (
    <Modal size="sm" onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Calculator</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Content className="p-0 pt-6">
        <div className="mb-4">
          {/* expression display */}
          <div
            className="w-full text-right text-base text-slate-500 font-mono min-h-[1.5rem]"
            role="status"
            aria-label="Calculator expression"
          >
            {calcExpr}
          </div>
          {/* current value display */}
          <input
            type="text"
            className="w-full text-2xl text-right font-mono bg-transparent border-none focus:ring-0 focus:outline-none"
            value={calcValue}
            readOnly
            aria-label="Calculator current value"
            aria-live="polite"
          />
        </div>
        <Numpad
          onNumberPress={handleNumpadNumber}
          onBackspace={handleNumpadBackspace}
          onClear={handleNumpadClear}
          onEnter={handleNumpadEnter}
          onOperatorPress={handleNumpadOperator}
        />
      </Modal.Content>
    </Modal>
  );
};
