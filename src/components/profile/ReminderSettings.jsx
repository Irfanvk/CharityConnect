import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getMemberSetup, saveMemberSetup } from "@/lib/memberSetup";

export default function ReminderSettings({ user }) {
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderDay, setReminderDay] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const localSetup = getMemberSetup(user?.id);
    if (localSetup?.reminder_settings) {
      setRemindersEnabled(localSetup.reminder_settings.enabled || false);
      setReminderDay(localSetup.reminder_settings.day || 5);
      return;
    }

    if (user?.reminder_settings) {
      setRemindersEnabled(user.reminder_settings.enabled || false);
      setReminderDay(user.reminder_settings.day || 5);
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const existing = getMemberSetup(user?.id) || {};
      saveMemberSetup(user?.id, {
        ...existing,
        reminder_settings: {
          enabled: remindersEnabled,
          day: parseInt(reminderDay)
        }
      });

      toast({
        title: "Settings saved",
        description: "Your reminder preferences have been updated for this account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save reminder settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-600" />
          <CardTitle className="text-lg">Payment Reminders</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
          <div className="flex-1">
            <Label className="text-base font-medium">Enable Monthly Reminders</Label>
            <p className="text-sm text-slate-500 mt-1">
              Receive email notifications for upcoming monthly payments
            </p>
          </div>
          <Switch
            checked={remindersEnabled}
            onCheckedChange={setRemindersEnabled}
          />
        </div>

        {remindersEnabled && (
          <div className="p-4 rounded-lg bg-slate-50 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Remind me on day
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="28"
                value={reminderDay}
                onChange={(e) => setReminderDay(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-slate-500">of each month</span>
            </div>
            <p className="text-xs text-slate-500">
              You'll receive an email reminder on day {reminderDay} of every month
            </p>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}