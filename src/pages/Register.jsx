import React, { useState } from "react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInput from "@/components/ui/phone-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, CheckCircle, XCircle, Loader2, MoonStar } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { APP_BRAND, APP_IMAGES, APP_PATHS } from "@/config/appPaths";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: enter code, 2: registration form + backend validation
  const [inviteCode, setInviteCode] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Validate username format and length
  const validateUsername = (username) => {
    if (!username) return '';
    
    if (username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    
    if (username.length > 30) {
      return 'Username must not exceed 30 characters';
    }
    
    // Allow alphanumeric, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    
    return '';
  };

  const verifyInviteCode = () => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const inviteCodePattern = /^INV-[A-Z0-9]{6}$/;

    if (!inviteCodePattern.test(normalizedCode)) {
      setError('Invalid invite code format. Expected format: INV-XXXXXX');
      return;
    }

    setInviteCode(normalizedCode);
    setStep(2);
    setError('');
  };

  const getReadableError = (err) => {
    const detail = err?.data?.detail;

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => item?.msg || item?.message)
        .filter(Boolean)
        .join(', ');
    }

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (typeof err?.data?.message === 'string' && err.data.message.trim()) {
      return err.data.message;
    }

    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message;
    }

    return 'Invalid invite or registration failed. Please try again or contact support.';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate username format
    const usernameErr = validateUsername(formData.username);
    if (usernameErr) {
      setError(usernameErr);
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      await charityClient.invites.validate(
        formData.email || formData.phone,
        inviteCode.trim().toUpperCase()
      );

      // Register with backend - creates both User and Member
      await charityClient.auth.register({
        invite_code: inviteCode.trim().toUpperCase(),
        username: formData.username,
        password: formData.password,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address || '',
        monthly_amount: 100
      });

      // Backend automatically:
      // - Creates User account
      // - Creates Member profile with auto-generated code (MEM-001, etc.)
      // - Marks invite as used
      // - Returns auth token

      setSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen overflow-hidden p-4 sm:p-6">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(circle at 16% 20%, rgba(125, 211, 252, 0.26), transparent 34%)',
              'radial-gradient(circle at 82% 18%, rgba(192, 132, 252, 0.18), transparent 30%)',
              'radial-gradient(circle at 84% 82%, rgba(16, 185, 129, 0.18), transparent 36%)',
              'linear-gradient(150deg, #f8fafc 0%, #eff6ff 34%, #f0fdfa 68%, #fefce8 100%)',
            ].join(','),
          }}
        />
        <div className="relative z-10 flex min-h-[calc(100vh-2rem)] items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <Card className="max-w-md w-full border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Your account has been created successfully! You can now access your dashboard.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Go to Dashboard
              </Button>
              <Button asChild variant="outline">
                <Link to={APP_PATHS.LOGIN}>Back to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-6">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 16% 20%, rgba(125, 211, 252, 0.26), transparent 34%)',
            'radial-gradient(circle at 82% 18%, rgba(192, 132, 252, 0.18), transparent 30%)',
            'radial-gradient(circle at 84% 82%, rgba(16, 185, 129, 0.18), transparent 36%)',
            'linear-gradient(150deg, #f8fafc 0%, #eff6ff 34%, #f0fdfa 68%, #fefce8 100%)',
          ].join(','),
        }}
      />

      <div
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          backgroundImage: [
            'repeating-linear-gradient(60deg, rgba(14, 116, 144, 0.08) 0 2px, transparent 2px 24px)',
            'repeating-linear-gradient(-60deg, rgba(5, 150, 105, 0.08) 0 2px, transparent 2px 24px)',
          ].join(','),
        }}
      />

      <div className="pointer-events-none absolute left-6 top-10 h-24 w-24 rounded-full border border-sky-300/70 bg-sky-100/40 dark:border-sky-200/50 dark:bg-sky-200/10" />
      <div className="pointer-events-none absolute right-6 top-12 h-20 w-20 rounded-full border border-violet-300/70 bg-violet-100/40 dark:border-violet-200/50 dark:bg-violet-200/10" />
      <div className="pointer-events-none absolute bottom-14 right-10 h-32 w-32 rounded-full border border-emerald-300/60 bg-white/50 dark:border-emerald-200/40 dark:bg-white/10" />

      <div className="relative z-10 flex min-h-[calc(100vh-2rem)] items-center justify-center sm:min-h-[calc(100vh-3rem)]">
      <Card className="max-w-md w-full border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
        <CardHeader className="text-center pb-6">
          <div className="w-14 h-14 rounded-xl bg-white/80 dark:bg-slate-800/80 p-2 mx-auto mb-3 shadow-md">
            <img
              src={APP_IMAGES.LOGOS.PRIMARY}
              alt={`${APP_BRAND.NAME} logo`}
              className="h-full w-full object-contain"
            />
          </div>
          {/* <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
            {step === 1 ? <MoonStar className="w-8 h-8 text-white" /> : <Heart className="w-8 h-8 text-white" />}
          </div> */}
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {step === 1 ? `Join ${APP_BRAND.NAME}` : 'Complete Registration'}
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-2">
            {step === 1 ? 'Enter your invite code to begin' : 'Fill in your details to create your account'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="bg-rose-50 border-rose-200">
              <XCircle className="w-4 h-4 text-rose-600" />
              <AlertDescription className="text-rose-700">{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="text-slate-800 dark:text-slate-100">Invite Code</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="INV-XXXXXX"
                  className="text-center text-lg tracking-wider font-mono"
                />
              </div>
              <Button 
                onClick={verifyInviteCode}
                disabled={!inviteCode}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Verify Code
              </Button>
              <p className="text-xs text-center text-slate-600 dark:text-slate-300">
                Don't have an invite code? Contact an administrator.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-800 dark:text-slate-100">
                  Username * 
                  {usernameError && (
                    <span className="text-rose-600 dark:text-rose-400 text-xs ml-1">({usernameError})</span>
                  )}
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    const username = e.target.value;
                    setFormData({...formData, username});
                    setUsernameError(validateUsername(username));
                  }}
                  placeholder="Choose a username (3-30 characters)"
                  autoComplete="username"
                  required
                  className={usernameError ? 'border-rose-500' : ''}
                />
                {!usernameError && formData.username && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Username looks good</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-800 dark:text-slate-100">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-800 dark:text-slate-100">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-800 dark:text-slate-100">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-800 dark:text-slate-100">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <PhoneInput
                  id="phone"
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                You can complete additional profile details (address, city, etc.) after registration.
              </p>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Register
                </Button>
              </div>
            </form>
          )}

          <div className="pt-2 text-center">
            <Link to={APP_PATHS.LOGIN} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}