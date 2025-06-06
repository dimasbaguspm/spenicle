import React, { useState, useEffect } from 'react';

import { Modal } from '../modal';
import { Numpad } from '../numpad';

interface CalculatorModalProps {
  isOpen: boolean;
  initialValue: string;
  onSubmit: (value: number) => void;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, initialValue, onSubmit, onClose }) => {
  const [calcValue, setCalcValue] = useState<string>(initialValue);
  const [calcExpr, setCalcExpr] = useState<string>('');
  const [lastInput, setLastInput] = useState<'number' | 'operator' | 'equals' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCalcValue(initialValue);
      setCalcExpr('');
      setLastInput(null);
    }
  }, [isOpen, initialValue]);

  const evaluateExpr = (expr: string): string => {
    try {
      if (!/^[0-9+\-*/.\s]+$/.test(expr)) return calcValue;
      const result = eval(expr);
      if (typeof result === 'number' && isFinite(result)) {
        return result.toString();
      }
      return calcValue;
    } catch {
      return calcValue;
    }
  };

  const handleNumpadNumber = (num: string) => {
    if (lastInput === 'equals') {
      setCalcExpr(num);
      setCalcValue(num);
    } else {
      setCalcExpr((prev) => prev + num);
      setCalcValue((prev) => (prev === '0' ? num : prev + num));
    }
    setLastInput('number');
  };

  const handleNumpadOperator = (op: string) => {
    if (op === '=') {
      const result = evaluateExpr(calcExpr);
      setCalcValue(result);
      setCalcExpr(result);
      setLastInput('equals');
    } else {
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
  const handleNumpadBackspace = () => {
    if (lastInput === 'equals') {
      setCalcExpr('');
      setCalcValue('0');
      setLastInput(null);
    } else {
      setCalcExpr((prev) => prev.slice(0, -1));
      setCalcValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    }
  };
  const handleNumpadClear = () => {
    setCalcExpr('');
    setCalcValue('0');
    setLastInput(null);
  };
  const handleNumpadEnter = () => {
    const parsed = parseFloat(calcValue);
    if (!isNaN(parsed)) onSubmit(parsed);
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
          <div className="w-full text-right text-base text-slate-500 font-mono min-h-[1.5rem]">{calcExpr}</div>
          <input
            type="text"
            className="w-full text-2xl text-right font-mono bg-transparent border-none focus:ring-0 focus:outline-none"
            value={calcValue}
            readOnly
            aria-label="Calculator value"
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
