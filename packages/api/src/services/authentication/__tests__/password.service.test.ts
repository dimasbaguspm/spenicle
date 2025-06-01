import bcrypt from 'bcrypt';
import { Mock, vi } from 'vitest';

import { PasswordService } from '../password.service.ts';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Get the mocked functions with proper typing
const mockHash = bcrypt.hash as Mock;
const mockCompare = bcrypt.compare as Mock;

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with default salt rounds', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      mockHash.mockResolvedValue(hashedPassword);

      const result = await passwordService.hashPassword(plainPassword);

      expect(result).toBe(hashedPassword);
      expect(mockHash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it('should handle different password lengths', async () => {
      const shortPassword = 'short';
      const longPassword = 'thisIsAVeryLongPasswordWithManyCharacters123!@#';
      const hashedShort = '$2b$10$hashedShortPassword';
      const hashedLong = '$2b$10$hashedLongPassword';

      mockHash.mockResolvedValueOnce(hashedShort).mockResolvedValueOnce(hashedLong);

      const resultShort = await passwordService.hashPassword(shortPassword);
      const resultLong = await passwordService.hashPassword(longPassword);

      expect(resultShort).toBe(hashedShort);
      expect(resultLong).toBe(hashedLong);
      expect(mockHash).toHaveBeenNthCalledWith(1, shortPassword, 10);
      expect(mockHash).toHaveBeenNthCalledWith(2, longPassword, 10);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()';
      const hashedSpecial = '$2b$10$hashedSpecialPassword';

      mockHash.mockResolvedValue(hashedSpecial);

      const result = await passwordService.hashPassword(specialPassword);

      expect(result).toBe(hashedSpecial);
      expect(mockHash).toHaveBeenCalledWith(specialPassword, 10);
    });

    it('should handle empty password', async () => {
      const emptyPassword = '';
      const hashedEmpty = '$2b$10$hashedEmptyPassword';

      mockHash.mockResolvedValue(hashedEmpty);

      const result = await passwordService.hashPassword(emptyPassword);

      expect(result).toBe(hashedEmpty);
      expect(mockHash).toHaveBeenCalledWith(emptyPassword, 10);
    });

    it('should handle unicode characters in password', async () => {
      const unicodePassword = 'पासवर्ड123🔒';
      const hashedUnicode = '$2b$10$hashedUnicodePassword';

      mockHash.mockResolvedValue(hashedUnicode);

      const result = await passwordService.hashPassword(unicodePassword);

      expect(result).toBe(hashedUnicode);
      expect(mockHash).toHaveBeenCalledWith(unicodePassword, 10);
    });

    it('should propagate bcrypt errors', async () => {
      const plainPassword = 'testPassword123';
      const bcryptError = new Error('Bcrypt hashing failed');

      mockHash.mockRejectedValue(bcryptError);

      await expect(passwordService.hashPassword(plainPassword)).rejects.toThrow('Bcrypt hashing failed');
    });

    it('should call bcrypt.hash exactly once per call', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      mockHash.mockResolvedValue(hashedPassword);

      await passwordService.hashPassword(plainPassword);

      expect(mockHash).toHaveBeenCalledTimes(1);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const plainPassword = 'testPassword123';
      const hash = '$2b$10$validHashForTestPassword';

      mockCompare.mockResolvedValue(true);

      const result = await passwordService.comparePassword(plainPassword, hash);

      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalledWith(plainPassword, hash);
    });

    it('should return false for non-matching password and hash', async () => {
      const plainPassword = 'wrongPassword';
      const hash = '$2b$10$validHashForDifferentPassword';

      mockCompare.mockResolvedValue(false);

      const result = await passwordService.comparePassword(plainPassword, hash);

      expect(result).toBe(false);
      expect(mockCompare).toHaveBeenCalledWith(plainPassword, hash);
    });

    it('should handle special characters in password comparison', async () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()';
      const hash = '$2b$10$validHashForSpecialPassword';

      mockCompare.mockResolvedValue(true);

      const result = await passwordService.comparePassword(specialPassword, hash);

      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalledWith(specialPassword, hash);
    });

    it('should handle unicode characters in password comparison', async () => {
      const unicodePassword = 'पासवर्ड123🔒';
      const hash = '$2b$10$validHashForUnicodePassword';

      mockCompare.mockResolvedValue(true);

      const result = await passwordService.comparePassword(unicodePassword, hash);

      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalledWith(unicodePassword, hash);
    });

    it('should handle empty password comparison', async () => {
      const emptyPassword = '';
      const hash = '$2b$10$validHashForEmptyPassword';

      mockCompare.mockResolvedValue(false);

      const result = await passwordService.comparePassword(emptyPassword, hash);

      expect(result).toBe(false);
      expect(mockCompare).toHaveBeenCalledWith(emptyPassword, hash);
    });

    it('should handle empty hash comparison', async () => {
      const plainPassword = 'testPassword123';
      const emptyHash = '';

      mockCompare.mockResolvedValue(false);

      const result = await passwordService.comparePassword(plainPassword, emptyHash);

      expect(result).toBe(false);
      expect(mockCompare).toHaveBeenCalledWith(plainPassword, emptyHash);
    });

    it('should handle invalid hash format', async () => {
      const plainPassword = 'testPassword123';
      const invalidHash = 'invalid-hash-format';

      mockCompare.mockResolvedValue(false);

      const result = await passwordService.comparePassword(plainPassword, invalidHash);

      expect(result).toBe(false);
      expect(mockCompare).toHaveBeenCalledWith(plainPassword, invalidHash);
    });

    it('should propagate bcrypt comparison errors', async () => {
      const plainPassword = 'testPassword123';
      const hash = '$2b$10$validHash';
      const bcryptError = new Error('Bcrypt comparison failed');

      mockCompare.mockRejectedValue(bcryptError);

      await expect(passwordService.comparePassword(plainPassword, hash)).rejects.toThrow('Bcrypt comparison failed');
    });

    it('should call bcrypt.compare exactly once per call', async () => {
      const plainPassword = 'testPassword123';
      const hash = '$2b$10$validHash';

      mockCompare.mockResolvedValue(true);

      await passwordService.comparePassword(plainPassword, hash);

      expect(mockCompare).toHaveBeenCalledTimes(1);
    });

    it('should handle case sensitivity correctly', async () => {
      const lowerCasePassword = 'password123';
      const upperCasePassword = 'PASSWORD123';
      const hash = '$2b$10$validHashForLowerCase';

      mockCompare
        .mockResolvedValueOnce(true) // for lowercase
        .mockResolvedValueOnce(false); // for uppercase

      const resultLower = await passwordService.comparePassword(lowerCasePassword, hash);
      const resultUpper = await passwordService.comparePassword(upperCasePassword, hash);

      expect(resultLower).toBe(true);
      expect(resultUpper).toBe(false);
      expect(mockCompare).toHaveBeenNthCalledWith(1, lowerCasePassword, hash);
      expect(mockCompare).toHaveBeenNthCalledWith(2, upperCasePassword, hash);
    });

    it('should handle whitespace in passwords correctly', async () => {
      const passwordWithSpaces = ' password 123 ';
      const passwordTrimmed = 'password123';
      const hash = '$2b$10$validHash';

      mockCompare
        .mockResolvedValueOnce(false) // for password with spaces
        .mockResolvedValueOnce(true); // for trimmed password

      const resultSpaces = await passwordService.comparePassword(passwordWithSpaces, hash);
      const resultTrimmed = await passwordService.comparePassword(passwordTrimmed, hash);

      expect(resultSpaces).toBe(false);
      expect(resultTrimmed).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should correctly hash and then verify the same password', async () => {
      const originalPassword = 'testPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      // Mock hash operation
      mockHash.mockResolvedValue(hashedPassword);

      // Mock compare operation to return true for correct password
      mockCompare.mockResolvedValue(true);

      // Hash the password
      const hash = await passwordService.hashPassword(originalPassword);

      // Verify the password
      const isValid = await passwordService.comparePassword(originalPassword, hash);

      expect(hash).toBe(hashedPassword);
      expect(isValid).toBe(true);
      expect(mockHash).toHaveBeenCalledWith(originalPassword, 10);
      expect(mockCompare).toHaveBeenCalledWith(originalPassword, hashedPassword);
    });

    it('should fail verification with wrong password after hashing', async () => {
      const originalPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      // Mock hash operation
      mockHash.mockResolvedValue(hashedPassword);

      // Mock compare operation to return false for wrong password
      mockCompare.mockResolvedValue(false);

      // Hash the correct password
      const hash = await passwordService.hashPassword(originalPassword);

      // Try to verify with wrong password
      const isValid = await passwordService.comparePassword(wrongPassword, hash);

      expect(hash).toBe(hashedPassword);
      expect(isValid).toBe(false);
      expect(mockCompare).toHaveBeenCalledWith(wrongPassword, hashedPassword);
    });
  });
});
