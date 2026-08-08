import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInput from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DatePickerField from "@/components/ui/date-picker-field";
import { format } from "date-fns";
import { Info, Loader2 } from "lucide-react";

const getInitialFormData = (member, suggestedId) => ({
  member_id: member?.member_id || suggestedId || '',
  full_name: member?.full_name || '',
  username: member?.username || '',
  phone: member?.phone || '',
  email: member?.email || '',
  address: member?.address || '',
  city: member?.city || '',
  join_date: member?.join_date || format(new Date(), 'yyyy-MM-dd'),
  status: member?.status || 'active',
  monthly_amount: member?.monthly_amount ?? 100,
  notes: member?.notes || ''
});

export default function MemberForm({ open, onOpenChange, member, onSubmit, suggestedId, existingMembers, isFetchingMember = false }) {
  const [formData, setFormData] = useState(() => getInitialFormData(member, suggestedId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData(member, suggestedId));
      setError('');
    }
  }, [open, member, suggestedId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Check for duplicate member_id
    const duplicate = existingMembers?.find(m => 
      m.member_id === formData.member_id && m.id !== member?.id
    );
    
    if (duplicate) {
      setError(`Member ID "${formData.member_id}" is already taken. Please use a different ID.`);
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {member ? 'Edit Member' : 'Add New Member'}
          </DialogTitle>
        </DialogHeader>

        {member && isFetchingMember ? (
          <div className="py-8 flex items-center justify-center text-slate-600">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading member details...
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="member_id">Member ID *</Label>
              <Input
                id="member_id"
                value={formData.member_id}
                onChange={(e) => setFormData({...formData, member_id: e.target.value})}
                placeholder="MEM-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="john_doe"
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="Mumbai"
              />
            </div>

            <div className="space-y-2">
              <Label>Join Date</Label>
              <DatePickerField
                id="join_date"
                value={formData.join_date}
                onChange={(next) => setFormData({ ...formData, join_date: next })}
                size="large"
                placeholder="Pick a date"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_amount">Monthly Amount (₹)</Label>
              <Input
                id="monthly_amount"
                type="number"
                value={formData.monthly_amount}
                onChange={(e) => setFormData({...formData, monthly_amount: parseFloat(e.target.value)})}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {!member && (
            <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              <Info className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" />
              <span>After adding, create an invite code so this member can set their own password.</span>
            </div>
          )}

          <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-background/95 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || isFetchingMember} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {member ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}