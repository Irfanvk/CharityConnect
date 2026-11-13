import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInput from "@/components/ui/phone-input";
import { Progress } from "@/components/ui/progress";
import { 
  User, Bell, Receipt, CheckCircle, 
  ArrowRight, ArrowLeft 
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PaymentReminderSetting, { ordinal } from "@/components/PaymentReminderSetting";
import { holdAutoInstall } from "@/lib/installPrompt";
import { APP_BRAND } from "@/config/appPaths";
import { useToast } from "@/components/ui/use-toast";
import { isValidInternationalPhone } from "@/lib/phone-utils";
import LocationFields from "@/components/members/LocationFields";

export default function OnboardingWizard({ open, onComplete, user, memberProfile }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(open);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  // The install popup waits until this setup form is closed.
  useEffect(() => {
    if (!internalOpen) return undefined;
    return holdAutoInstall();
  }, [internalOpen]);
  
  const [formData, setFormData] = useState({
    phone: user?.phone || memberProfile?.phone || '',
    email: user?.email || memberProfile?.email || '',
    address: memberProfile?.address || '',
    city: memberProfile?.city || '',
    country: memberProfile?.country || '',
    reminderEnabled: true,
    reminderDay: null, // filled from the server (member's day or the organisation's day)
  });

  const { data: prefs } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => charityClient.notifications.getPreferences(),
    enabled: Boolean(open && user?.id),
  });
  const reminder = prefs?.payment_reminder;

  useEffect(() => {
    if (!reminder) return;
    setFormData((prev) => (prev.reminderDay != null ? prev : {
      ...prev,
      reminderEnabled: Boolean(reminder.enabled),
      reminderDay: reminder.day,
    }));
  }, [reminder]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      phone: user?.phone || memberProfile?.phone || prev.phone || '',
      email: user?.email || memberProfile?.email || prev.email || '',
      address: memberProfile?.address || prev.address || '',
      city: memberProfile?.city || prev.city || '',
      country: memberProfile?.country || prev.country || '',
    }));
  }, [user, memberProfile]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const normalizedPhone = String(formData.phone || '').trim();
      const normalizedEmail = String(formData.email || '').trim().toLowerCase();
      if (!isValidInternationalPhone(normalizedPhone)) {
        throw new Error('Enter a valid phone number with country code.');
      }

      const registeredPhone = String(user?.phone || '').trim();
      const registeredEmail = String(user?.email || '').trim().toLowerCase();

      const contactChangeRequests = [];
      if (registeredPhone && normalizedPhone !== registeredPhone) {
        contactChangeRequests.push(
          charityClient.requests.create({
            request_type: 'approval',
            subject: 'Phone number change approval',
            message: `Member requested phone update from ${registeredPhone} to ${normalizedPhone}.`,
            priority: 'high',
          })
        );
      }

      if (registeredEmail && normalizedEmail && normalizedEmail !== registeredEmail) {
        contactChangeRequests.push(
          charityClient.requests.create({
            request_type: 'approval',
            subject: 'Email change approval',
            message: `Member requested email update from ${registeredEmail} to ${normalizedEmail}.`,
            priority: 'high',
          })
        );
      }

      if (contactChangeRequests.length > 0) {
        await Promise.all(contactChangeRequests);
        toast({
          title: 'Approval request submitted',
          description: 'Phone/email updates were sent to admin for approval.',
        });
      }

      if (!formData.country || !String(formData.city || '').trim()) {
        throw new Error('Please choose the country you live in and enter your city.');
      }
      try {
        const updated = await charityClient.members.updateMyLocation({
          country: formData.country,
          city: String(formData.city).trim(),
        });
        queryClient.setQueryData(['members', 'me'], updated);
      } catch (locationError) {
        // Someone without a member record (e.g. a superadmin) has no location to save.
        if (memberProfile?.id || locationError?.status !== 404) throw locationError;
      }

      // Saved on the server, so the setup is done on every device.
      const address = String(formData.address || '').trim();
      const reminderDay = Number(formData.reminderDay || reminder?.day || 1);
      const saved = await charityClient.auth.completeOnboarding({
        address: address || null,
        payment_reminder_enabled: Boolean(formData.reminderEnabled),
        payment_reminder_day: reminderDay,
      });
      if (saved?.address_needs_approval) {
        // Changing an address that is already on record goes through the admins.
        await charityClient.requests.create({
          request_type: 'profile_update',
          subject: 'Address update request',
          message: `Please update my address to: ${address}`,
          requested_changes: { address },
        });
        toast({ title: 'Address sent for approval', description: 'An admin will update it shortly.' });
      }

      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setStep(1);
      setInternalOpen(false);

      onComplete?.({
        phone: normalizedPhone,
        email: normalizedEmail,
        address,
        onboarding_completed_at: saved?.onboarding_completed_at,
        reminder_settings: {
          enabled: Boolean(formData.reminderEnabled),
          day: reminderDay,
        },
      });
    } catch (error) {
      toast({
        title: 'Setup could not be completed',
        description: error?.message || 'Please review your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={internalOpen} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setStep(1);
      }
      setInternalOpen(newOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-2xl font-bold">
            {step === 1 && "Complete Your Profile"}
            {step === 2 && "Set Your Preferences"}
            {step === 3 && "Understanding Challans"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">
                Step {step} of {totalSteps}
              </span>
              <span className="text-sm text-slate-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

        {/* Step 1: Complete Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {`Welcome to ${APP_BRAND.NAME}! 👋`}
              </h2>
              <p className="text-slate-500">
                Let's get your profile set up so you can start making contributions
              </p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-lg">
              <div>
                <PhoneInput
                  id="phone"
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Enter your address"
                />
              </div>

              <LocationFields
                idPrefix="setup"
                country={formData.country}
                city={formData.city}
                phone={formData.phone}
                onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))}
              />

              <p className="text-xs text-slate-500">
                For security, phone and email changes after registration require admin approval and are sent to Requests.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Setup Reminders */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Set Up Payment Reminders
              </h2>
              <p className="text-slate-500">
                Never miss a monthly payment. We'll send you a notification on the day you choose.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 sm:p-6 rounded-lg">
              <PaymentReminderSetting
                enabled={formData.reminderEnabled}
                day={formData.reminderDay || reminder?.day || 1}
                onChange={({ enabled, day }) => setFormData((prev) => ({
                  ...prev,
                  ...(enabled !== undefined ? { reminderEnabled: enabled } : {}),
                  ...(day !== undefined ? { reminderDay: day } : {}),
                }))}
              />
              {formData.reminderEnabled && (
                <p className="text-xs text-slate-500">
                  You'll be reminded on the {ordinal(formData.reminderDay || reminder?.day || 1)} of every month, in the app and on your phone if notifications are on.
                  You can change this any time in Notifications → Settings.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Learn About Challans */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Understanding Challans
              </h2>
              <p className="text-slate-500">
                {`Here's how to make payments in ${APP_BRAND.NAME}`}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-emerald-600">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Generate a Challan</h3>
                    <p className="text-sm text-slate-600">
                      Go to the Challans page and click "Generate Challan" to create a payment slip for your monthly membership or campaign donation
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Make Payment</h3>
                    <p className="text-sm text-slate-600">
                      Transfer the amount using your preferred payment method and take a screenshot or photo of the payment confirmation
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-amber-600">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Upload Proof</h3>
                    <p className="text-sm text-slate-600">
                      Return to the Challans page and upload your payment proof. An admin will review and approve it
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-900 font-medium mb-1">
                    You're all set!
                  </p>
                  <p className="text-xs text-emerald-700">
                    You can generate your first challan from the Challans page anytime
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Footer with buttons - always visible at bottom */}
        <div className="px-6 py-6 border-t flex justify-between gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {step === 1 && <div className="flex-1"></div>}
          
          {step === 1 && (
            <Button 
              onClick={handleNext}
              disabled={!formData.phone || !formData.email || !formData.country || !String(formData.city || '').trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === 2 && (
            <Button 
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === 3 && (
            <Button 
              onClick={handleComplete}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Completing..." : "Complete Setup"} <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}