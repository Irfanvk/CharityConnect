import React, { useState } from "react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_BRAND } from "@/config/appPaths";

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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 mb-6">
              Your account has been created successfully! You can now access your dashboard.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {step === 1 ? `Join ${APP_BRAND.NAME}` : 'Complete Registration'}
          </CardTitle>
          <p className="text-slate-500 text-sm mt-2">
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
                <Label htmlFor="inviteCode">Invite Code</Label>
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
              <p className="text-xs text-center text-slate-500">
                Don't have an invite code? Contact an administrator.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Choose a username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
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
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
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
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
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
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  autoComplete="tel"
                  required
                />
              </div>

              <p className="text-xs text-slate-500">
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
        </CardContent>
      </Card>
    </div>
  );
}