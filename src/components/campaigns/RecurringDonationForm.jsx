import React, { useState, useEffect } from "react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";

export default function RecurringDonationForm({ open, onOpenChange, campaign, onSubmit }) {
  const [formData, setFormData] = useState({
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await charityClient.auth.me();
      setUser(currentUser);
      
      const members = await charityClient.members.list();
      const userMember = members.find(m => m.email === currentUser.email);
      setMember(userMember);
    };
    loadUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const nextDate = new Date(formData.start_date);
    if (formData.frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    await onSubmit({
      campaign_id: campaign.id,
      campaign_name: campaign.title,
      member_id: member?.id,
      member_name: member?.full_name || user?.full_name,
      member_email: user?.email,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      start_date: formData.start_date,
      next_donation_date: nextDate.toISOString().split('T')[0],
      status: 'active'
    });

    setLoading(false);
    setFormData({ amount: '', frequency: 'monthly', start_date: new Date().toISOString().split('T')[0] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Recurring Donation</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Support {campaign?.title} with automatic donations
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 <strong>Note:</strong> You'll receive a reminder before each donation date to generate and pay your challan.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Donation Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              min={campaign?.min_amount || 1}
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="Enter amount"
              required
            />
            {campaign?.min_amount && (
              <p className="text-xs text-slate-500">
                Minimum: ₹{campaign.min_amount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({...formData, frequency: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="pl-10"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.amount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Set Up Recurring Donation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}