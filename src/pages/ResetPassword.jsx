import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { charityClient } from '@/api/charityClient';
import { APP_BRAND, APP_IMAGES } from '@/config/appPaths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [tokenStatus, setTokenStatus] = useState('verifying'); // verifying | valid | invalid
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      await charityClient.auth.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-6">
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

      <div className="relative z-10 flex min-h-svh items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <Card className="w-full max-w-md border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-white/80 p-2 shadow-md dark:bg-slate-800/80">
              <img
                src={APP_IMAGES.LOGOS.PRIMARY}
                alt={`${APP_BRAND.NAME} logo`}
                className="h-full w-full object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-emerald-900 dark:text-emerald-200">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-emerald-800/80 dark:text-emerald-100/80">
              {tokenStatus === 'valid' && username ? `Setting new password for @${username}` : 'Enter your new password below.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {tokenStatus === 'verifying' && (
              <div className="py-8 flex items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verifying your reset link...
              </div>
            )}

            {tokenStatus === 'invalid' && (
              <div className="py-6 text-center space-y-4">
                <XCircle className="mx-auto h-12 w-12 text-rose-500" />
                <p className="font-medium text-slate-800 dark:text-slate-200">Link is invalid or has expired</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Password reset links expire after 24 hours. Please submit a new request.
                </p>
                <Link to="/ForgotPassword" className="inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                  Request a new link
                </Link>
              </div>
            )}

            {tokenStatus === 'valid' && done && (
              <div className="py-6 text-center space-y-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <p className="font-medium text-slate-800 dark:text-slate-200">Password updated successfully!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You can now sign in with your new password.
                </p>
              </div>
            )}

            {tokenStatus === 'valid' && !done && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-800 dark:text-slate-100">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    required
                    disabled={isSubmitting}
                    autoFocus
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-800 dark:text-slate-100">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    required
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !newPassword || !confirmPassword}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Set New Password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-slate-600 dark:text-slate-300">
              <Link to="/login" className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                Back to Sign In
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
