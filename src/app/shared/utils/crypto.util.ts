import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

const SECRET = environment.cryptoSecret;

export function encryptValue(value: string): string {
  const encrypted = CryptoJS.AES.encrypt(value, SECRET).toString();
  // URL-safe base64: replace +/= with URI-safe chars
  return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~');
}

export function decryptValue(encoded: string): string {
  // Restore standard base64 before decryption
  const encrypted = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/~/g, '=');
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}
