import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { charityClient } from '@/api/charityClient';
import { useAuth } from '@/lib/AuthContext';
import { APP_IMAGES, APP_PATHS } from '@/config/appPaths';
import { useOrgBrand } from '@/lib/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2, Clock, XCircle, BadgeCheck } from 'lucide-react';
import { REMEMBERED_LOGIN_KEY } from '@/config/constants';
import { markNewLogin } from '@/lib/installPrompt';

// Only the username is remembered. The password is never stored by the app;
// the browser's password manager can offer to save it (autocomplete attributes below).
function readRememberedUsername() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_KEY) || 'null');
    return typeof saved?.username === 'string' ? saved.username : '';
  } catch {
    return '';
  }
}

const ACTIVATION_STATUS_TYPES = new Set(['activation_pending', 'activation_rejected']);

// Credentials that belong to a self-activation request (no account yet) come
// back as 403 with detail[0].type = activation_pending | activation_rejected.
function readActivationStatus(err) {
  const first = Array.isArray(err?.data?.detail) ? err.data.detail[0] : null;
  if (first && ACTIVATION_STATUS_TYPES.has(first.type)) {
    return { type: first.type, ...(first.input || {}) };
  }
  return null;
}

function formatDay(iso) {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function ActivationStatus({ status, onBack }) {
  const pending = status.type === 'activation_pending';
  const firstName = String(status.full_name || '').trim().split(/\s+/)[0];
  return (
    <CardContent className="space-y-4 text-center">
      {pending
        ? <Clock className="mx-auto h-12 w-12 text-amber-500" />
        : <XCircle className="mx-auto h-12 w-12 text-rose-500" />}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {pending ? `Thanks${firstName ? `, ${firstName}` : ''}. Your request is with the admins.` : 'Your request was not approved'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Member ID <strong>{status.member_code}</strong>
          {pending && status.submitted_at && <> · sent {formatDay(status.submitted_at)}</>}
        </p>
      </div>
      {pending ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Once an admin confirms your details, sign in again with the same username and password to get full access.
        </p>
      ) : (
        <>
          {status.reason && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-left text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="text-xs font-medium uppercase tracking-wide">Reason</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{status.reason}</p>
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Please check your Member ID and details and apply again, or contact an admin.
          </p>
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Link to="/activate">Apply again</Link>
          </Button>
        </>
      )}
      <Button variant="outline" className="w-full" onClick={onBack}>Back to sign in</Button>
    </CardContent>
  );
}

function saveRememberedUsername(username) {
  try {
    if (username) {
      localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({ username }));
    } else {
      localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    }
  } catch {
    // Storage blocked (private mode) — remember-me simply has no prefill.
  }
}

export default function Login() {
  const orgBrand = useOrgBrand();
  const location = useLocation();
  // Arriving from a successful registration pre-fills the new username.
  const registeredUsername = location.state?.registeredUsername || '';
  // Arriving from a sent activation request.
  const activationUsername = location.state?.activationUsername || '';
  const [rememberedUsername] = useState(readRememberedUsername);
  const [credentials, setCredentials] = useState({
    username: registeredUsername || activationUsername || rememberedUsername,  // Accepts both username and email
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedUsername));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activationStatus, setActivationStatus] = useState(null);
  const [activationEnabled, setActivationEnabled] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    let alive = true;
    charityClient.memberActivations.availability().then((r) => alive && setActivationEnabled(Boolean(r?.enabled)));
    return () => { alive = false; };
  }, []);
  const { setAuthenticatedUser, isAuthenticated } = useAuth();

  const returnToParam = new URLSearchParams(location.search).get('returnTo');
  // Security: only allow relative paths to prevent open-redirect attacks
  const isSafeReturnTo = returnToParam?.startsWith('/') && !returnToParam.startsWith('//');
  const redirectTarget = isSafeReturnTo && returnToParam.toLowerCase() !== APP_PATHS.LOGIN
    ? returnToParam : APP_PATHS.HOME;

  // Redirect away if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Trim username (not password) to avoid accidental whitespace rejections
      const username = credentials.username.trim();
      const response = await charityClient.auth.login({
        ...credentials,
        username,
        remember_me: rememberMe,
      });
      saveRememberedUsername(rememberMe ? username : '');
      markNewLogin(); // install popup may show once for this sign-in
      
      const currentUser = response?.user || await charityClient.auth.me();
      if (!currentUser) {
        throw new Error('Login succeeded but user session could not be established.');
      }

      setAuthenticatedUser(currentUser);
      
      // Redirect to dashboard
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      const activation = readActivationStatus(err);
      if (activation) {
        setActivationStatus(activation);
        setCredentials((prev) => ({ ...prev, password: '' }));
        return;
      }
      console.error('Login error:', err);
      const status = err?.status ?? err?.response?.status;
      let msg;
      if (status === 401 || status === 403) {
        msg = 'Invalid username or password.';
      } else if (status === 429) {
        msg = 'Too many login attempts. Please wait a moment and try again.';
      } else if (status >= 500 || err?.name === 'TypeError') {
        msg = 'Server is unavailable. Please try again shortly.';
      } else {
        msg = err?.message || 'Login failed. Please check your credentials and try again.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
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

      <div
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          backgroundImage: [
            'repeating-linear-gradient(45deg, rgba(15, 118, 110, 0.08) 0 2px, transparent 2px 26px)',
            'repeating-linear-gradient(-45deg, rgba(217, 119, 6, 0.08) 0 2px, transparent 2px 26px)',
          ].join(','),
        }}
      />

      <div className="pointer-events-none absolute -left-16 top-8 h-44 w-44 rounded-full border border-amber-300/70 bg-amber-100/35 dark:border-amber-200/50 dark:bg-amber-200/10" />
      <div className="pointer-events-none absolute -left-8 top-20 h-32 w-32 rounded-full border border-amber-300/60 bg-transparent dark:border-amber-200/40" />
      <div className="pointer-events-none absolute bottom-16 right-8 h-36 w-36 rounded-full border border-emerald-300/60 bg-white/50 dark:border-emerald-200/40 dark:bg-white/10" />

      <div className="relative z-10 flex min-h-svh items-center justify-center pb-[env(safe-area-inset-bottom)]">
      <Card className="w-full max-w-md border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-white/80 p-2 shadow-md dark:bg-slate-800/80">
            <img
              src={orgBrand.logoUrl || APP_IMAGES.LOGOS.PRIMARY}
              alt={`${orgBrand.name} logo`}
              className="h-full w-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-emerald-900 dark:text-emerald-200">
            {`Welcome to ${orgBrand.name}`}
          </CardTitle>
          <CardDescription className="text-center text-emerald-800/80 dark:text-emerald-100/80">
            {orgBrand.loginWelcomeText || 'Sign in to manage your charity contributions'}
          </CardDescription>
        </CardHeader>
        
        {activationStatus ? (
          <ActivationStatus status={activationStatus} onBack={() => setActivationStatus(null)} />
        ) : (
        <>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {activationUsername && !error && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <AlertDescription>Request sent. Sign in with your new username and password to check its status.</AlertDescription>
              </Alert>
            )}

            {registeredUsername && !error && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <AlertDescription>Registration successful. Sign in with your new password.</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-800 dark:text-slate-100">Username or Email</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter username or email"
                value={credentials.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoComplete="username"
                autoFocus={!credentials.username}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-800 dark:text-slate-100">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  autoFocus={Boolean(credentials.username)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(value) => setRememberMe(value === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <div className="grid gap-0.5 leading-none">
                <Label htmlFor="remember-me" className="cursor-pointer text-slate-800 dark:text-slate-100">
                  Remember me
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Don't use on shared devices.
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col space-y-3">
          {activationEnabled && (
            <Button asChild variant="outline" className="h-auto w-full whitespace-normal border-emerald-300 py-2.5 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/40">
              <Link to="/activate">
                <BadgeCheck className="mr-2 h-4 w-4 shrink-0" />
                I'm already a member – activate my account
              </Link>
            </Button>
          )}
          <div className="text-sm text-center text-slate-600 dark:text-slate-300">
            <Link
              to="/forgotpassword"
              className="font-medium text-slate-500 hover:underline dark:text-slate-400"
            >
              Forgot password?
            </Link>
          </div>
          <div className="text-sm text-center text-slate-600 dark:text-slate-300">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Register with invite code
            </Link>
          </div>
        </CardFooter>
        </>
        )}
      </Card>
      </div>
    </div>
  );
}
