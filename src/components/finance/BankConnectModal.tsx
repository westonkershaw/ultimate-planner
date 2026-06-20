import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2, CreditCard, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { searchBanks } from '@/data/ofxBanks';
import type { OFXBank } from '@/data/ofxBanks';
import { buildBankRequest, encryptCredential, fetchOFXData, getStartDate } from '@/utils/ofxConnect';
import type { OFXConnectParams } from '@/utils/ofxConnect';
import { useFinanceStore } from '@/store';
import { APP_SPRING } from '@/hooks/useAppSpring';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'bank' | 'credentials' | 'testing';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export default function BankConnectModal({ open, onClose }: Props) {
  const addLinkedAccount = useFinanceStore((s) => s.addLinkedAccount);

  const [step, setStep] = useState<Step>('bank');
  const [query, setQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<OFXBank | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'CHECKING' | 'SAVINGS' | 'CREDITCARD'>('CHECKING');
  const [accountId, setAccountId] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');

  const filtered = useMemo(() => searchBanks(query), [query]);

  const reset = useCallback(() => {
    setStep('bank');
    setQuery('');
    setSelectedBank(null);
    setUsername('');
    setPassword('');
    setAccountType('CHECKING');
    setAccountId('');
    setRoutingNumber('');
    setTestStatus('idle');
    setTestError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSelectBank = useCallback((bank: OFXBank) => {
    setSelectedBank(bank);
    setStep('credentials');
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!selectedBank) return;
    setStep('testing');
    setTestStatus('testing');
    setTestError('');

    try {
      const params: OFXConnectParams = {
        bank: selectedBank,
        username,
        password,
        accountType,
        accountId,
        routingNumber,
        startDate: getStartDate(7),
      };
      const ofxBody = buildBankRequest(params);
      await fetchOFXData(selectedBank.ofxUrl, ofxBody);
      setTestStatus('success');
    } catch (err) {
      setTestStatus('error');
      setTestError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [selectedBank, username, password, accountType, accountId, routingNumber]);

  const handleSave = useCallback(async () => {
    if (!selectedBank) return;
    const [encUser, encPass] = await Promise.all([
      encryptCredential(username),
      encryptCredential(password),
    ]);
    addLinkedAccount({
      bankName: selectedBank.name,
      bankOFXUrl: selectedBank.ofxUrl,
      bankOrg: selectedBank.org,
      bankFid: selectedBank.fid,
      accountType,
      accountId,
      routingNumber,
      lastSynced: null,
      encryptedUsername: encUser,
      encryptedPassword: encPass,
    });
    handleClose();
  }, [selectedBank, username, password, accountType, accountId, routingNumber, addLinkedAccount, handleClose]);

  const credentialsValid = username && password && accountId && (accountType === 'CREDITCARD' || routingNumber);

  return (
    <Modal open={open} onClose={handleClose} title="Link Bank Account" maxWidth="max-w-md">
      <AnimatePresence mode="wait">
        {step === 'bank' && (
          <motion.div key="bank" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={APP_SPRING}>
            <Input
              placeholder="Search banks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search size={14} />}
              autoFocus
            />
            <div className="mt-3 max-h-[320px] overflow-auto space-y-1 pr-1">
              {filtered.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No banks found</p>
              )}
              {filtered.map((bank) => (
                <button
                  key={bank.fid + bank.org}
                  onClick={() => handleSelectBank(bank)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-indigo-400" />
                  </div>
                  <span className="text-sm text-slate-200 flex-1 truncate">{bank.name}</span>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'credentials' && selectedBank && (
          <motion.div key="creds" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={APP_SPRING}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Building2 size={14} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{selectedBank.name}</p>
                <p className="text-[10px] text-slate-500">OFX Direct Connect</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Bank username" autoFocus />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Bank password" />
              <Select label="Account Type" value={accountType} onChange={(e) => setAccountType(e.target.value as typeof accountType)}>
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
                <option value="CREDITCARD">Credit Card</option>
              </Select>
              <Input label="Account Number" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account number" />
              {accountType !== 'CREDITCARD' && (
                <Input label="Routing Number" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} placeholder="9-digit routing number" />
              )}
            </div>

            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
              Credentials are encrypted and stored only in your browser. They are never sent to our servers.
            </p>

            <div className="flex gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('bank')}>Back</Button>
              <Button size="sm" disabled={!credentialsValid} onClick={handleTestConnection} className="flex-1">
                <CreditCard size={14} /> Test Connection
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'testing' && (
          <motion.div key="test" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={APP_SPRING} className="flex flex-col items-center py-6 gap-4">
            {testStatus === 'testing' && (
              <>
                <Loader2 size={32} className="text-indigo-400 animate-spin" />
                <p className="text-sm text-slate-300">Connecting to {selectedBank?.name}...</p>
              </>
            )}
            {testStatus === 'success' && (
              <>
                <CheckCircle2 size={32} className="text-emerald-400" />
                <p className="text-sm text-slate-300">Connection successful!</p>
                <div className="flex gap-2 w-full">
                  <Button variant="ghost" size="sm" onClick={() => setStep('credentials')}>Back</Button>
                  <Button size="sm" onClick={handleSave} className="flex-1">Save & Link Account</Button>
                </div>
              </>
            )}
            {testStatus === 'error' && (
              <>
                <AlertCircle size={32} className="text-red-400" />
                <div className="text-center">
                  <p className="text-sm text-slate-300">Connection failed</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">{testError}</p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="ghost" size="sm" onClick={() => setStep('credentials')}>Back</Button>
                  <Button variant="amber" size="sm" onClick={handleTestConnection} className="flex-1">Retry</Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
