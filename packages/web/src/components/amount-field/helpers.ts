// utility functions for amount field component

/**
 * validates mathematical expression for security
 * prevents injection attacks and ensures safe evaluation
 */
export const validateExpression = (expression: string): boolean => {
  // only allow numbers, basic operators, decimal points, and whitespace
  const safePattern = /^[0-9+\-*/.\s]+$/;
  return safePattern.test(expression) && expression.trim().length > 0;
};

/**
 * safely evaluates mathematical expressions
 * returns original value if evaluation fails or is unsafe
 */
export const safeEvaluateExpression = (expression: string, fallbackValue: string): string => {
  try {
    if (!validateExpression(expression)) {
      return fallbackValue;
    }

    // additional security check - limit expression length
    if (expression.length > 100) {
      return fallbackValue;
    }

    const result = eval(expression);

    if (typeof result === 'number' && isFinite(result) && !isNaN(result)) {
      return result.toString();
    }

    return fallbackValue;
  } catch {
    return fallbackValue;
  }
};

/**
 * sanitizes numeric input to prevent injection
 * ensures only valid number formats are processed
 */
export const sanitizeNumericInput = (input: string): string => {
  // remove any non-numeric characters except decimal point and minus sign
  return input.replace(/[^0-9.-]/g, '');
};

/**
 * validates if string represents a valid number
 * includes boundary checks for safety
 */
export const isValidNumber = (value: string): boolean => {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && num >= 0 && num <= Number.MAX_SAFE_INTEGER;
};

/**
 * formats number for display
 * ensures consistent formatting across component
 */
export const formatNumberDisplay = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0' : numValue.toString();
};
