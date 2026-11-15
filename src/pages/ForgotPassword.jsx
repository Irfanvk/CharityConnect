import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { charityClient } from '@/api/charityClient';
import { APP_BRAND, APP_IMAGES } from '@/config/appPaths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, MessageCircle, Phone } from 'lucide-react';
import { PHONE_COUNTRIES } from '@/lib/phone-utils';
import { useAuthText } from '@/lib/authI18n';
import { LanguageSwitch } from '@/components/reports/simple/ReportsShared';

/*
 * Forgot password, made for people who find typing hard: pick the country, type only the
 * phone digits (spaces or a leading 0 are fine). The server matches the phone or WhatsApp
 * number however it was saved, and an admin sends the reset link on WhatsApp.
 */

// A good first guess for the country from the phone's time zone.
const ZONE_COUNTRY = {
  'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Kuwait': 'KW', 'Asia/Muscat': 'OM', 'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Baghdad': 'IQ', 'Asia/Baku': 'AZ',
  'Africa/Casablanca': 'MA', 'Africa/Johannesburg': 'ZA', 'Europe/London': 'GB',
};

function guessCountry() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ZONE_COUNTRY[zone] || 'SA';
  } catch {
    return 'SA';
  }
}

export default function ForgotPassword() {
  const T = useAuthText();
  const [mode, setMode] = useState('phone'); // phone | text
  const [country, setCountry] = useState(guessCountry);
  const [digits, setDigits] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const dial = useMemo(() => PHONE_COUNTRIES.find((c) => c.iso === country)?.dialCode || '', [country]);
  const local = digits.replace(/\D/g, '').replace(/^0+/, '');
  const ready = mode === 'phone' ? local.length >= 7 : identifier.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready) {
      setError(T.t('tooShort'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await charityClient.auth.forgotPassword(mode === 'phone' ? `${dial}${local}` : identifier.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
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
              {T.t('forgotTitle')}
            </CardTitle>
            <CardDescription className="text-center text-base text-emerald-800/80 dark:text-emerald-100/80">
              {T.t('forgotSub')}
            </CardDescription>
          </CardHeader>

          {submitted ? (
            <CardContent className="space-y-4 py-6">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">{T.t('sentTitle')}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <p className="mb-2 font-semibold">{T.t('sentWhat')}</p>
                <ol className="space-y-2 text-base">
                  <li className="flex gap-2"><span className="font-bold">1.</span>{T.t('sent1')}</li>
                  <li className="flex gap-2"><span className="font-bold">2.</span><span><MessageCircle className="mr-1 inline h-4 w-4" />{T.t('sent2')}</span></li>
                  <li className="flex gap-2"><span className="font-bold">3.</span>{T.t('sent3')}</li>
                </ol>
              </div>
              <p className="text-center text-sm text-slate-500">{T.t('sentNote')}</p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
                )}
                {mode === 'phone' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fp-country" className="text-base text-slate-800 dark:text-slate-100">{T.t('step1')}</Label>
                      <Select value={country} onValueChange={setCountry} disabled={isLoading}>
                        <SelectTrigger id="fp-country" className="h-12 text-base"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PHONE_COUNTRIES.map((c) => (
                            <SelectItem key={c.iso} value={c.iso} className="text-base">{c.name} ({c.dialCode})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fp-phone" className="text-base text-slate-800 dark:text-slate-100">{T.t('step2')}</Label>
                      <div className="flex items-center overflow-hidden rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-slate-900">
                        <span className="flex h-12 items-center gap-1 border-r border-input bg-slate-50 px-3 text-base font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <Phone className="h-4 w-4" />{dial}
                        </span>
                        <input
                          id="fp-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={digits}
                          onChange={(e) => { setDigits(e.target.value.replace(/[^\d\s-]/g, '')); setError(''); }}
                          placeholder={PHONE_COUNTRIES.find((c) => c.iso === country)?.placeholder || ''}
                          disabled={isLoading}
                          autoFocus
                          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-lg tracking-wide outline-none"
                        />
                      </div>
                      <p className="text-sm text-slate-500">{T.t('phoneHint')}</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-base text-slate-800 dark:text-slate-100">{T.t('usernameOrEmail')}</Label>
                    <Input
                      id="identifier"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={isLoading}
                      autoFocus
                      className="h-12 text-base"
                    />
                  </div>
                )}
                <Button type="submit" className="h-12 w-full text-base" disabled={isLoading || !ready}>
                  {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{T.t('sending')}</> : T.t('sendRequest')}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'phone' ? 'text' : 'phone'); setError(''); }}
                  className="w-full text-center text-sm text-slate-500 underline-offset-2 hover:underline"
                >
                  {mode === 'phone' ? T.t('useOther') : T.t('usePhone')}
                </button>
              </CardContent>
            </form>
          )}

          <CardFooter className="flex flex-col space-y-2">
            <Link to="/login" className="text-base font-medium text-emerald-700 hover:underline dark:text-emerald-300">
              {T.t('backToLogin')}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
