/**
 * AES-256-GCM encryption service for PII at rest (BVN, NIN, TOTP secrets).
 *
 * Storage format: {ivHex}:{authTagHex}:{ciphertextHex}
 *
 * Each encryption uses a fresh random 12-byte IV (GCM recommended size).
 * The 16-byte auth tag provides integrity verification on decryption.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm' as const;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const SEP = ':';

function getKey(): Buffer {
  const hex = process.env['ENCRYPTION_KEY'];
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a string safe to store in the database.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(SEP);
}

/**
 * Decrypt a value previously encrypted with `encrypt()`.
 * Throws if tampered (GCM auth tag mismatch).
 */
export function decrypt(stored: string): string {
  const parts = stored.split(SEP);
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');

  if (iv.length !== IV_BYTES) throw new Error('Invalid IV length');
  if (tag.length !== TAG_BYTES) throw new Error('Invalid auth tag length');

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ct).toString('utf8') + decipher.final('utf8');
}

/**
 * Encrypt a value only if it is non-null/non-empty.
 */
export function encryptOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

/**
 * Decrypt a value only if it is non-null.
 */
export function decryptOptional(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return decrypt(stored);
}
