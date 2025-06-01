import bcrypt from 'bcrypt';

export class PasswordService {
  /**
   * Hash a plain password
   */
  async hashPassword(plainPassword: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(plainPassword, saltRounds);
  }

  /**
   * Compare a plain password with a hash
   */
  async comparePassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
