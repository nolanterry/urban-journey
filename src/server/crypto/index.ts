/**
 * Token encryption/decryption module
 * 
 * Uses AES-256-GCM for authenticated encryption at rest.
 * Never log raw tokens or keys.
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Key must be 32+ bytes, hex encoded
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }

  // Validate key is hex and at least 64 characters (32 bytes)
  if (!/^[0-9a-fA-F]{64,}$/.test(keyHex)) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a hex string of at least 64 characters (32 bytes)'
    );
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length < KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be at least ${KEY_LENGTH} bytes (got ${key.length})`
    );
  }

  // Use first 32 bytes if longer
  return key.slice(0, KEY_LENGTH);
}

/**
 * Encrypt a token for storage at rest
 * 
 * @param token - Plain text token to encrypt
 * @returns Encrypted token string (format: salt:iv:tag:ciphertext, all hex)
 */
export async function encryptToken(token: string): Promise<string> {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  const key = getEncryptionKey();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from master key + salt
  const derivedKey = (await scryptAsync(key, salt, KEY_LENGTH)) as Buffer;

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Format: salt:iv:tag:ciphertext (all hex)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted,
  ].join(':');
}

/**
 * Decrypt a token from storage
 * 
 * @param encryptedToken - Encrypted token string (format: salt:iv:tag:ciphertext)
 * @returns Plain text token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken || typeof encryptedToken !== 'string') {
    throw new Error('Encrypted token must be a non-empty string');
  }

  const parts = encryptedToken.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format');
  }

  const [saltHex, ivHex, tagHex, ciphertext] = parts;

  const key = getEncryptionKey();
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  // Derive key from master key + salt
  const derivedKey = (await scryptAsync(key, salt, KEY_LENGTH)) as Buffer;

  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
