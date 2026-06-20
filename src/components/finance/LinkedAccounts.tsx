import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, RefreshCw, Trash2, Clock, Loader2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useFinanceStore } from '@/store';
import { decryptCredential, buildBankRequest, fetchOFXData, getStartDate } from '@/utils/ofxConnect';
import type { OFXConnectParams } from '@/utils/ofxConnect';
import { parseOFXFile, guessCategory } from '@/utils/fileImportParser';
import type { LinkedAccount, CreateTransactionInput } from '@/types';
import { APP_SPRING } from '@/hooks/useAppSpring';

function formatLastSynced(ts: number | null): string {
  if (!ts) return 'Never synced';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const ACCOUNT_LABELS: Record<string, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDITCARD: 'Credit Card',
};

export default function LinkedAccounts() {
  const linkedAccounts = useFinanceStore((s) => s.linkedAccounts);
  const updateLinkedAccount = useFinanceStore((s) => s.updateLinkedAccount);
  const removeLinkedAccount = useFinanceStore((s) => s.removeLinkedAccount);
  const addTransactions = useFinanceStore((s) => s.addTransactions);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<Record<string, string>>({});
  const [syncSuccess, setSyncSuccess] = useState<Record<string, number>>({});

  const handleSync = useCallback(async (account: LinkedAccount) => {
    setSyncingId(account.id);
    setSyncError((prev) => ({ ...prev, [account.id]: '' }));
    setSyncSuccess((prev) => {
      const next = { ...prev };
      delete next[account.id];
      return next;
    });

    try {
      const [username, password] = await Promise.all([
        decryptCredential(account.encryptedUsername),
        decryptCredential(account.encryptedPassword),
      ]);

      const params: OFXConnectParams = {
        bank: {
          name: account.bankName,
          ofxUrl: account.bankOFXUrl,
          org: account.bankOrg,
          fid: account.bankFid,
        },
        username,
        password,
        accountType: account.accountType,
        accountId: account.accountId,
        routingNumber: account.routingNumber,
        startDate: getStartDate(account.lastSynced ? 14 : 30),
      };

      const ofxBody = buildBankRequest(params);
      const ofxData = await fetchOFXData(account.bankOFXUrl, ofxBody);
      const parsed = parseOFXFile(ofxData);

      if (parsed.length > 0) {
        const txs: CreateTransactionInput[] = parsed.map((raw) => ({
          amount: raw.amount,
          description: raw.description,
          category: guessCategory(raw.description),
          date: new Date(raw.date).getTime(),
          source: 'ofx' as const,
          importedAt: Date.now(),
        }));
        addTransactions(txs);
      }

      updateLinkedAccount(account.id, { lastSynced: Date.now() });
      setSyncSuccess((prev) => ({ ...prev, [account.id]: parsed.length }));
    } catch (err) {
      setSyncError((prev) => ({
        ...prev,
        [account.id]: err instanceof Error ? err.message : 'Sync failed',
      }));
    } finally {
      setSyncingId(null);
    }
  }, [addTransactions, updateLinkedAccount]);

  const handleRemove = useCallback((id: string) => {
    removeLinkedAccount(id);
  }, [removeLinkedAccount]);

  if (linkedAccounts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
        Linked Accounts
      </h3>
      <AnimatePresence>
        {linkedAccounts.map((acct) => (
          <motion.div
            key={acct.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={APP_SPRING}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-slate-800/60"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Building2 size={14} className="text-indigo-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate">{acct.bankName}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>{ACCOUNT_LABELS[acct.accountType] ?? acct.accountType}</span>
                <span className="text-slate-700">|</span>
                <Clock size={10} className="inline" />
                <span>{formatLastSynced(acct.lastSynced)}</span>
              </div>
              {syncError[acct.id] && (
                <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
                  <AlertCircle size={10} /> {syncError[acct.id]}
                </p>
              )}
              {syncSuccess[acct.id] !== undefined && (
                <p className="text-[10px] text-emerald-400 mt-0.5">
                  Imported {syncSuccess[acct.id]} transactions
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSync(acct)}
                disabled={syncingId === acct.id}
                aria-label="Sync account"
              >
                {syncingId === acct.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RefreshCw size={14} />}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRemove(acct.id)}
                disabled={syncingId === acct.id}
                aria-label="Remove account"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
