/**
 * ofxConnect.ts
 *
 * OFX Direct Connect request builder and credential helpers.
 * Builds SGML-formatted OFX requests for bank statement downloads.
 */

import type { OFXBank } from '@/data/ofxBanks';
import type { LinkedAccount } from '@/types';

export type { LinkedAccount };

export interface OFXConnectParams {
  bank: OFXBank;
  username: string;
  password: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDITCARD';
  accountId: string;
  routingNumber: string;
  startDate: string; // YYYYMMDD
}

// ── OFX Request Builder ────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function todayOFX(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}120000`;
}

function buildSignon(username: string, password: string, org: string, fid: string): string {
  return `<SIGNONMSGSRQV1>
<SONRQ>
<DTCLIENT>${todayOFX()}
<USERID>${username}
<USERPASS>${password}
<LANGUAGE>ENG
<FI>
<ORG>${org}
<FID>${fid}
</FI>
<APPID>QWIN
<APPVER>2700
</SONRQ>
</SIGNONMSGSRQV1>`;
}

/**
 * Build an OFX request for a bank checking/savings account.
 */
export function buildBankRequest(params: OFXConnectParams): string {
  const header = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:${uid()}

`;

  const signon = buildSignon(params.username, params.password, params.bank.org, params.bank.fid);

  if (params.accountType === 'CREDITCARD') {
    return `${header}<OFX>
${signon}
<CREDITCARDMSGSRQV1>
<CCSTMTTRNRQ>
<TRNUID>${uid()}
<CCSTMTRQ>
<CCACCTFROM>
<ACCTID>${params.accountId}
</CCACCTFROM>
<INCTRAN>
<DTSTART>${params.startDate}
<INCLUDE>Y
</INCTRAN>
</CCSTMTRQ>
</CCSTMTTRNRQ>
</CREDITCARDMSGSRQV1>
</OFX>`;
  }

  return `${header}<OFX>
${signon}
<BANKMSGSRQV1>
<STMTTRNRQ>
<TRNUID>${uid()}
<STMTRQ>
<BANKACCTFROM>
<BANKID>${params.routingNumber}
<ACCTID>${params.accountId}
<ACCTTYPE>${params.accountType}
</BANKACCTFROM>
<INCTRAN>
<DTSTART>${params.startDate}
<INCLUDE>Y
</INCTRAN>
</STMTRQ>
</STMTTRNRQ>
</BANKMSGSRQV1>
</OFX>`;
}

// ── Credential Encryption ──────────────────────────────────────────────────

const ENCRYPTION_KEY = 'up_ofx_key_v1';

/**
 * Simple AES-GCM encryption using Web Crypto API.
 * Key derived from a fixed passphrase + random salt per encryption.
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(ENCRYPTION_KEY),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptCredential(plaintext: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  // Pack: salt(16) + iv(12) + ciphertext → base64
  const packed = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...packed));
}

export async function decryptCredential(encoded: string): Promise<string> {
  const dec = new TextDecoder();
  const packed = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveKey(salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return dec.decode(decrypted);
}

// ── Sync Helper ────────────────────────────────────────────────────────────

/**
 * Send an OFX request through the proxy and return the raw OFX response.
 */
export async function fetchOFXData(
  bankUrl: string,
  ofxBody: string,
): Promise<string> {
  const res = await fetch('/api/ofx-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bankUrl, ofxBody }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Bank returned status ${res.status}`);
  }

  const data = await res.json();
  return data.ofxData;
}

/**
 * Get the OFX start date (30 days ago by default).
 */
export function getStartDate(daysBack = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
