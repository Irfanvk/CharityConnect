import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function Register() {
  const [step, setStep] = useState(1); // 1: verify code, 2: registration form
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedInvite, setVerifiedInvite] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: invites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: () => base44.entities.Invite.list(),
  });

  const verifyInviteCode = () => {
    const invite = invites.find(i => 
      i.invite_code === inviteCode.toUpperCase() && 
      i.status === 'pending' &&
      new Date(i.expires_at) > new Date()
    );

    if (!invite) {
      setError('Invalid or expired invite code. Please contact an administrator.');
      return;
    }

    setVerifiedInvite(invite);
    setFormData({
      ...formData,
      phone: invite.phone || '',
      email: invite.email || ''
    });
    setStep(2);
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create member record
      await base44.entities.Member.create({
        member_id: `MEM-${Date.now().toString().slice(-4)}`, // Temp ID, admin will assign proper one
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        join_date: new Date().toISOString().split('T')[0],
        status: 'active',
        monthly_amount: 100,
        invited_by: verifiedInvite.invited_by,
        notes: 'Profile incomplete - needs to add address and city'
      });

      // Mark invite as used
      await base44.entities.Invite.update(verifiedInvite.id, {
        status: 'used',
        used_at: new Date().toISOString()
      });

      setSuccess(true);
    } catch (err) {
      setError('Registration failed. Please try again or contact support.');
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
              Your account has been created. An administrator will assign your official Member ID and you'll receive login credentials shortly.
            </p>
            <Button 
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Go to Login
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
            {step === 1 ? 'Join CharityHub' : 'Complete Registration'}
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
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>

              <p className="text-xs text-slate-500">
                You'll be asked to complete your profile (address, city, etc.) after registration.
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