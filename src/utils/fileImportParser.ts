/**
 * fileImportParser.ts
 *
 * Parsers for OFX/QFX bank statement files and CSV column mapping helpers.
 * No side effects — pure functions only.
 */

import type { TransactionCategory } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RawImportedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: TransactionCategory;
  source: 'csv' | 'ofx';
}

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
}

// ── OFX/QFX Parser ────────────────────────────────────────────────────────

/**
 * Parse an OFX/QFX file (SGML format) and extract transactions.
 * OFX files contain <STMTTRN> blocks with <DTPOSTED>, <TRNAMT>, <NAME>, <MEMO>.
 */
export function parseOFXFile(text: string): RawImportedTransaction[] {
  const transactions: RawImportedTransaction[] = [];

  // Split into STMTTRN blocks
  const blockRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>))/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    const block = match[1] ?? '';

    const amt = extractOFXTag(block, 'TRNAMT');
    const dateRaw = extractOFXTag(block, 'DTPOSTED');
    const name = extractOFXTag(block, 'NAME') || extractOFXTag(block, 'MEMO') || 'Unknown';

    if (!amt || !dateRaw) continue;

    const amount = parseFloat(amt);
    if (isNaN(amount) || amount === 0) continue;

    const date = parseOFXDate(dateRaw);
    const type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';

    transactions.push({
      date,
      description: name.trim(),
      amount: Math.abs(amount),
      type,
      category: guessCategory(name),
      source: 'ofx',
    });
  }

  return transactions;
}

function extractOFXTag(block: string, tag: string): string | null {
  // OFX tags can be either <TAG>value\n or <TAG>value</TAG>
  const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
  const m = block.match(regex);
  return m ? m[1]!.trim() : null;
}

function parseOFXDate(raw: string): string {
  // OFX dates: YYYYMMDD or YYYYMMDDHHMMSS or YYYYMMDDHHMMSS[tz]
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8) return raw;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return `${y}-${m}-${d}`;
}

// ── CSV Column Mapping ─────────────────────────────────────────────────────

/**
 * Apply a user-defined column mapping to CSV rows and return parsed transactions.
 */
export function applyColumnMapping(
  rows: string[][],
  mapping: ColumnMapping,
  hasHeader: boolean,
): RawImportedTransaction[] {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const results: RawImportedTransaction[] = [];

  for (const cols of dataRows) {
    const description = (cols[mapping.description] ?? '').replace(/[*]/g, '').trim();
    if (!description) continue;

    const amountStr = (cols[mapping.amount] ?? '').replace(/[$,\s]/g, '');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) continue;

    const dateStr = cols[mapping.date] ?? '';
    const date = normalizeDate(dateStr);
    const type: 'income' | 'expense' = amount < 0 ? 'income' : 'expense';

    results.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
      category: guessCategory(description),
      source: 'csv',
    });
  }

  return results;
}

function normalizeDate(str: string): string {
  if (!str) return '';
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) return `${mdyMatch[3]}-${mdyMatch[1]!.padStart(2, '0')}-${mdyMatch[2]!.padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str;
}

// ── Auto-categorization ────────────────────────────────────────────────────

/**
 * Guess a transaction category from its description using keyword matching.
 */
export function guessCategory(name: string): TransactionCategory {
  const n = name.toLowerCase();
  if (/uber|lyft|taxi|parking|gas|shell|exxon|chevron|bp |valero/.test(n)) return 'transport';
  if (/amazon|walmart|target|costco|shop|store|market/.test(n)) return 'shopping';
  if (/restaurant|cafe|coffee|starbucks|mcdonald|chipotle|pizza|doordash|grubhub|ubereats|food/.test(n)) return 'food';
  if (/netflix|spotify|hulu|disney|apple\.com\/bill|google play|youtube/.test(n)) return 'entertainment';
  if (/gym|fitness|planet fitness|equinox|health|pharmacy|cvs|walgreens/.test(n)) return 'health';
  if (/rent|mortgage|electric|water|utility|comcast|at&t|verizon|t-mobile/.test(n)) return 'housing';
  if (/electric|water|sewer|trash|internet|phone|cable/.test(n)) return 'utilities';
  if (/salary|payroll|direct dep|zelle|venmo|cashapp/.test(n)) return 'income';
  return 'other';
}

/**
 * Detect whether a file is OFX/QFX based on content.
 */
export function isOFXContent(text: string): boolean {
  return /OFXHEADER|<OFX>/i.test(text.slice(0, 500));
}
