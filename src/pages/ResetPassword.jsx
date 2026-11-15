import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { charityClient } from '@/api/charityClient';
import { APP_BRAND, APP_IMAGES } from '@/config/appPaths';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, Eye, EyeOff, Loader2, Sparkles, XCircle } from 'lucide-react';
import { PASSWORD_RULES, suggestPassword, useAuthText } from '@/lib/authI18n';
import { LanguageSwitch } from '@/components/reports/simple/ReportsShared';

/*
 * Set a new password from the WhatsApp link. The rules stay as strict as the server's, but
 * each one ticks green while typing, the password can be shown, both boxes must match (green
 * tick), and "Suggest a password" fills in an easy one to write down.
 */

function PasswordBox({ id, label, value, onChange, show, onToggle, T, autoFocus }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base text-slate-800 dark:text-slate-100">{label}</Label>
      <div className="flex items-center overflow-hidden rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-slate-900">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-lg outline-none"
        />
        <button type="button" onClick={onToggle} className="flex h-12 items-center gap-1 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300" aria-label={show ? T.t('hide') : T.t('show')}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}{show ? T.t('hide') : T.t('show')}
        </button>
      </div>
    </div>
  );
}

function Tick({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 text-base ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>
      {ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <Circle className="h-5 w-5 shrink-0" />}
      {children}
    </li>
  );
}

export default function ResetPassword() {
  const T = useAuthText();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [tokenStatus, setTokenStatus] = useState('verifying'); // verifying | valid | invalid
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [suggested, setSuggested] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }
    charityClient.auth.verifyResetToken(token)
      .then((res) => {
        if (res?.valid) {
          setTokenStatus('valid');
          setUsername(res.user_username || '');
        } else {
          setTokenStatus('invalid');
        }
      })
      .catch(() => setTokenStatus('invalid'));
  }, [token]);

  const rules = PASSWORD_RULES.map(([key, test]) => [key, test(newPassword)]);
  const allRules = rules.every(([, ok]) => ok);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;

  const applySuggestion = () => {
    const value = suggestPassword();
    setSuggested(value);
    setNewPassword(value);
    setConfirmPassword(value);
    setShow(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRules || !matches) return;
    setError('');
    setIsSubmitting(true);
    try {
      await charityClient.auth.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message || T.t('failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-6" lang={T.locale}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 12% 18%, rgba(250, 204, 21, 0.26), transparent 34%)',
            'radial-gradient(circle at 86% 20%, rgba(45, 212, 191, 0.22), transparent 30%)',
            'radial-gradient(circle at 80% 82%, rgba(59, 130, 246, 0.18), transparent 36%)',
            'linear-gradient(145deg, #f8fafc 0%, #ecfeff 35%, #fefce8 68%, #fff7ed 100%)',
          ].join(','),
        }}
      />

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-3 pb-[env(safe-area-inset-bottom)]">
        <LanguageSwitch L={T} />
        <Card className="w-full max-w-md border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-white/80 p-2 shadow-md dark:bg-slate-800/80">
              <img src={APP_IMAGES.LOGOS.PRIMARY} alt={`${APP_BRAND.NAME} logo`} className="h-full w-full object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-emerald-900 dark:text-emerald-200">
              {T.t('resetTitle')}
            </CardTitle>
            {tokenStatus === 'valid' && username && (
              <CardDescription className="text-center text-base text-emerald-800/80 dark:text-emerald-100/80">
                {T.t('resetFor')}: <b>{username}</b>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {tokenStatus === 'verifying' && (
              <p className="flex items-center justify-center py-8 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{T.t('checking')}</p>
            )}

            {tokenStatus === 'invalid' && (
              <div className="space-y-4 py-6 text-center">
                <XCircle className="mx-auto h-14 w-14 text-rose-500" />
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{T.t('badLinkTitle')}</p>
                <p className="text-base text-slate-500">{T.t('badLinkText')}</p>
                <Button asChild className="h-12 w-full text-base"><Link to="/ForgotPassword">{T.t('askAgain')}</Link></Button>
              </div>
            )}

            {tokenStatus === 'valid' && done && (
              <div className="space-y-4 py-6 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{T.t('doneTitle')}</p>
                <p className="text-base text-slate-500">{T.t('doneText')}</p>
                <Button asChild className="h-12 w-full text-base"><Link to="/login">{T.t('signIn')}</Link></Button>
              </div>
            )}

            {tokenStatus === 'valid' && !done && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                <Button type="button" variant="outline" onClick={applySuggestion} className="h-12 w-full gap-2 border-emerald-300 text-base text-emerald-800 hover:bg-emerald-50">
                  <Sparkles className="h-5 w-5" />{T.t('suggest')}
                </Button>
                {suggested && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                    <p className="text-sm text-amber-900">{T.t('suggested')}</p>
                    <p className="mt-1 select-all font-mono text-2xl font-bold tracking-wide text-slate-900">{suggested}</p>
                  </div>
                )}

                <PasswordBox id="newPassword" label={T.t('newPassword')} value={newPassword} T={T}
                  onChange={(v) => { setNewPassword(v); setSuggested(''); setError(''); }} show={show} onToggle={() => setShow((s) => !s)} autoFocus />
                <ul className="space-y-1.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  {rules.map(([key, ok]) => <Tick key={key} ok={ok}>{T.t(key)}</Tick>)}
                </ul>

                <PasswordBox id="confirmPassword" label={T.t('againPassword')} value={confirmPassword} T={T}
                  onChange={(v) => { setConfirmPassword(v); setError(''); }} show={show} onToggle={() => setShow((s) => !s)} />
                {confirmPassword.length > 0 && (
                  <p className={`flex items-center gap-2 text-base font-medium ${matches ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {matches ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}{T.t('match')}
                  </p>
                )}

                <Button type="submit" className="h-12 w-full text-base" disabled={isSubmitting || !allRules || !matches}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{T.t('saving')}</> : T.t('save')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
