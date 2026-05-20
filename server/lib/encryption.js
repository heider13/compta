// AES-256-GCM encryption for per-cabinet INPI credentials.
//
// Master key: process.env.MASTER_ENCRYPTION_KEY
//   Must be a 32-byte key encoded as 64 hex characters.
//   Generate one with: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
//
// Encrypted format: "v1:<iv_hex>:<tag_hex>:<ciphertext_hex>"
//   - iv  : 12 bytes (recommended GCM IV size), hex-encoded (24 chars)
//   - tag : 16 bytes auth tag, hex-encoded (32 chars)
//   - ct  : variable-length ciphertext, hex-encoded
//
// Dev fallback: if MASTER_ENCRYPTION_KEY is absent we log a warning and use a
// base64 obfuscation scheme prefixed with "v0:". This is NOT secure — it only
// keeps creds out of plain-text in DB dumps during local dev. Production MUST
// set MASTER_ENCRYPTION_KEY.

const crypto = require('node:crypto');

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

let _key = null;
let _warned = false;

function getKey() {
  if (_key !== null) return _key;
  const hex = process.env.MASTER_ENCRYPTION_KEY;
  if (!hex) {
    if (!_warned) {
      console.warn(
        '[encryption] MASTER_ENCRYPTION_KEY missing — falling back to base64 obfuscation (DEV ONLY). ' +
          'Generate a key: node -e "console.log(require(\'node:crypto\').randomBytes(32).toString(\'hex\'))"',
      );
      _warned = true;
    }
    _key = false; // sentinel meaning "no real key configured"
    return _key;
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `MASTER_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Use 64 hex chars.`,
    );
  }
  _key = buf;
  return _key;
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const text = String(plaintext);
  const key = getKey();

  if (key === false) {
    // Dev fallback: base64 prefixed with v0:
    return 'v0:' + Buffer.from(text, 'utf8').toString('base64');
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

function decrypt(encryptedString) {
  if (encryptedString == null) return null;
  const s = String(encryptedString);

  if (s.startsWith('v0:')) {
    // Dev fallback decode
    return Buffer.from(s.slice(3), 'base64').toString('utf8');
  }

  if (!s.startsWith('v1:')) {
    throw new Error('decrypt: unknown encryption format (expected v1: or v0: prefix)');
  }

  const parts = s.split(':');
  if (parts.length !== 4) {
    throw new Error('decrypt: malformed v1 payload (expected v1:iv:tag:ct)');
  }
  const [, ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  if (key === false) {
    throw new Error('decrypt: MASTER_ENCRYPTION_KEY missing — cannot decrypt v1 payload');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  if (iv.length !== IV_BYTES) throw new Error('decrypt: invalid iv length');
  if (tag.length !== 16) throw new Error('decrypt: invalid tag length');

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

function isEncrypted(s) {
  if (typeof s !== 'string') return false;
  if (s.startsWith('v0:')) return true;
  return /^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(s);
}

module.exports = { encrypt, decrypt, isEncrypted };
