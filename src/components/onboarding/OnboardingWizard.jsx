import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  User, Bell, Receipt, CheckCircle, 
  ArrowRight, ArrowLeft 
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { APP_BRAND } from "@/config/appPaths";

export default function OnboardingWizard({ open, onComplete, user, memberProfile }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(open);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    setInternalOpen(open);
  }, [open]);
  
  const [formData, setFormData] = useState({
    phone: memberProfile?.phone || '',
    address: memberProfile?.address || '',
    city: memberProfile?.city || '',
    reminderEnabled: false,
    reminderDay: 5,
  });

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
      // Update user settings
      await charityClient.auth.updateMe?.({
        phone: formData.phone,
        reminder_settings: {
          enabled: formData.reminderEnabled,
          day: Number(formData.reminderDay)
        },
        onboarding_completed: true
      });

      // Update member profile
      if (memberProfile) {
        await charityClient.members.update(memberProfile.id, {
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['members'] });
      setStep(1);
      setInternalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={internalOpen} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setStep(1);
        onComplete();
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
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter your phone number"
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

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Enter your city"
                />
              </div>
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
                Never miss a monthly payment with email reminders
              </p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-lg">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Enable Monthly Reminders</p>
                  <p className="text-sm text-slate-500">Get notified before your payment is due</p>
                </div>
                <Switch
                  checked={formData.reminderEnabled}
                  onCheckedChange={(checked) => setFormData({...formData, reminderEnabled: checked})}
                />
              </div>

              {formData.reminderEnabled && (
                <div className="p-4 bg-white rounded-lg space-y-3">
                  <Label>Reminder Day</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={formData.reminderDay}
                      onChange={(e) => setFormData({...formData, reminderDay: e.target.value})}
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">of each month</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    You'll receive an email on day {formData.reminderDay} of every month
                  </p>
                </div>
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
              disabled={!formData.phone}
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