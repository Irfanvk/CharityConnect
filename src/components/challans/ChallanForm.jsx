import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { format, addMonths } from "date-fns";
import { Loader2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ChallanForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  members, 
  campaigns, 
  existingChallans,
  suggestedNumber,
  currentUser 
}) {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const normalizeId = (value) => (value === null || value === undefined ? '' : String(value));
  const areSameId = (left, right) => normalizeId(left) === normalizeId(right);

  // Find the current user's own member record
  const myMember = members.find(m => m.email === currentUser?.email);
  const defaultMemberId = !isAdmin && myMember ? normalizeId(myMember.id) : '';

  const [formData, setFormData] = useState({
    challan_number: suggestedNumber || '',
    member_id: defaultMemberId,
    type: 'monthly',
    amount: 100,
    month: format(new Date(), 'yyyy-MM'),
    campaign_id: '',
    notes: ''
  });
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [includeUpcomingMonths, setIncludeUpcomingMonths] = useState(false);
  const [loading, setLoading] = useState(false);
  // 🔥 ComboBox states
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Get unpaid months for selected member
  const getUnpaidMonths = (memberId) => {
    if (!memberId) return [];
    const paidMonths = existingChallans
      .filter(c => areSameId(c.member_id, memberId) && c.type === 'monthly' && c.status !== 'rejected')
      .map(c => c.month);
    
    const months = [];
    for (let i = -12; i <= 0; i++) {
      const month = format(addMonths(new Date(), i), 'yyyy-MM');
      if (!paidMonths.includes(month)) {
        months.push(month);
      }
    }
    return months;
  };

  const unpaidMonths = getUnpaidMonths(formData.member_id);

  const { data: payableMonthsData } = useQuery({
    queryKey: [
      "challans",
      "payable-months",
      formData.member_id,
      includeUpcomingMonths,
    ],
    enabled: Boolean(formData.member_id) && formData.type === "monthly",
    queryFn: () =>
      charityClient.challans.payableMonths({
        ...(isAdmin ? { member_id: Number(formData.member_id) } : {}),
        include_upcoming: includeUpcomingMonths,
        upcoming_count: 3,
      }),
  });

  const selectableMonths =
    payableMonthsData?.all_months?.length > 0
      ? payableMonthsData.all_months
      : unpaidMonths;

  useEffect(() => {
    setSelectedMonths((prev) => prev.filter((month) => selectableMonths.includes(month)));
  }, [formData.member_id, formData.type, includeUpcomingMonths, selectableMonths.join("|")]);

  useEffect(() => {
  if (!memberSearch) {
    setMemberOptions([]);
    return;
  }

  const delay = setTimeout(async () => {
    try {
      setLoadingMembers(true);

      const res = await charityClient.members.list({
        search: memberSearch,
      });

      setMemberOptions(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, 400);

  return () => clearTimeout(delay);
}, [memberSearch]);

useEffect(() => {
  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setShowDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const member = members.find(m => areSameId(m.id, formData.member_id));
    const campaign = campaigns.find(c => areSameId(c.id, formData.campaign_id));
    
    const monthsToPay = selectedMonths.length > 0 ? selectedMonths : [formData.month];
    const monthlyAmount = member?.monthly_amount || 100;
    const totalAmount = formData.type === 'monthly' 
      ? monthlyAmount * monthsToPay.length
      : Number(formData.amount);
    
await onSubmit({
  ...formData,
  // ✅ Parse to int or null — never send empty string for integer fields
  member_id: formData.member_id !== '' ? parseInt(formData.member_id, 10) : null,
  campaign_id: formData.campaign_id !== '' && formData.campaign_id !== '__no_campaign'
    ? parseInt(formData.campaign_id, 10)
    : null,
  challan_number: suggestedNumber,
  member_name: member?.full_name,
  campaign_name: campaign?.title,
  amount: totalAmount,
  member_monthly_amount: monthlyAmount,
  selected_months: formData.type === 'monthly' ? monthsToPay : [],
  months_covered: formData.type === 'monthly' ? monthsToPay : undefined,
  months_count: formData.type === 'monthly' ? monthsToPay.length : 1,
  month: formData.type === 'monthly' ? monthsToPay[0] : undefined
});
    setLoading(false);
    setSelectedMonths([]);
  };

  const toggleMonth = (month) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month].sort()
    );
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  const getMonthTag = (month) => {
    if (payableMonthsData?.upcoming_months?.includes(month)) {
      return { label: "Upcoming", className: "bg-indigo-100 text-indigo-700" };
    }
    if (month === payableMonthsData?.current_month) {
      return { label: "Current", className: "bg-emerald-100 text-emerald-700" };
    }
    return { label: "Pending", className: "bg-amber-100 text-amber-700" };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Generate Challan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Challan Number</Label>
            <Input value={suggestedNumber} disabled className="bg-slate-50" />
          </div>

          {isAdmin ? (
            <div className="space-y-2 relative" ref={dropdownRef}>
              <Label>Member *</Label>

              <Input
                placeholder="Search member..."
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowDropdown(true);
                }}
              />

              {showDropdown && (
                <div className="absolute z-50 w-full bg-white border rounded-md shadow max-h-60 overflow-y-auto">
                  {loadingMembers ? (
                    <div className="p-2 text-sm text-gray-500">Searching...</div>
                  ) : memberOptions.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No members found</div>
                  ) : (
                    memberOptions.map((member) => (
                      <div
                        key={member.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            member_id: String(member.id),
                          });
                          setMemberSearch(`${member.full_name} (${member.member_id})`);
                          setShowDropdown(false);
                          setSelectedMonths([]);
                          setIncludeUpcomingMonths(false);
                        }}
                      >
                        {member.full_name} ({member.member_id})
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : myMember ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <p className="text-xs text-slate-500 mb-1">Member</p>
              <p className="font-medium text-slate-900 dark:text-white">{myMember.full_name}</p>
              <p className="text-xs text-slate-500">{myMember.member_id}</p>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <p className="text-sm text-rose-600">No member record found for your account. Please contact admin.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({...formData, type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Membership</SelectItem>
                <SelectItem value="donation">Campaign Donation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'monthly' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Include upcoming months</p>
                  <p className="text-xs text-slate-500">Allow next 3 months in addition to current and pending dues</p>
                </div>
                <Checkbox
                  id="include-upcoming-months"
                  checked={includeUpcomingMonths}
                  onCheckedChange={(checked) => setIncludeUpcomingMonths(Boolean(checked))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Select Months to Pay *</Label>
                {selectedMonths.length > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/50">
                {selectableMonths.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">All months paid</p>
                ) : (
                  selectableMonths.map(month => (
                    <div key={month} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                      <Checkbox
                        id={`month-${month}`}
                        checked={selectedMonths.includes(month)}
                        onCheckedChange={() => toggleMonth(month)}
                      />
                      <label
                        htmlFor={`month-${month}`}
                        className="flex-1 text-sm font-medium cursor-pointer select-none flex items-center justify-between gap-2"
                      >
                        <span>
                          <Calendar className="w-3 h-3 inline mr-2 text-slate-400" />
                          {format(new Date(month + '-01'), 'MMMM yyyy')}
                        </span>
                        <Badge className={getMonthTag(month).className}>{getMonthTag(month).label}</Badge>
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500">
                {selectedMonths.length === 0 
                  ? "Select one or more months to pay" 
                  : "You can pay for multiple months in a single transaction"}
              </p>
            </div>
          )}

          {formData.type === 'donation' && (
            <>
              <div className="space-y-2">
                <Label>Campaign *</Label>
                <Select
                  value={formData.campaign_id}
                  onValueChange={(value) => {
                    const campaign = campaigns.find(c => areSameId(c.id, value));
                    setFormData({
                      ...formData, 
                      campaign_id: value,
                      amount: campaign?.min_amount || 100
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCampaigns.length === 0 ? (
                      <SelectItem value="__no_campaign" disabled>No active campaigns</SelectItem>
                    ) : (
                      activeCampaigns.map(campaign => (
                        <SelectItem key={campaign.id} value={normalizeId(campaign.id)}>
                          {campaign.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Donation Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  min={campaigns.find(c => areSameId(c.id, formData.campaign_id))?.min_amount || 1}
                />
              </div>
            </>
          )}

          {formData.type === 'monthly' && formData.member_id && selectedMonths.length > 0 && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Payment Summary</p>
              </div>
              <div className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                <p>Monthly Amount: ₹{members.find(m => areSameId(m.id, formData.member_id))?.monthly_amount || 100}</p>
                <p>Months: {selectedMonths.length}</p>
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-700">
                  <p className="font-semibold text-base text-emerald-900 dark:text-emerald-100">
                    Total: ₹{((members.find(m => areSameId(m.id, formData.member_id))?.monthly_amount || 100) * selectedMonths.length).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.member_id || (!isAdmin && !myMember) || (formData.type === 'donation' && !formData.campaign_id) || (formData.type === 'monthly' && selectedMonths.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-700 select-none"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Challan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}