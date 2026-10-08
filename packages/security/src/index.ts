import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: Record<string, unknown>, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

export function verifyToken(token: string, secret: string): Record<string, unknown> {
  return jwt.verify(token, secret) as Record<string, unknown>;
}
