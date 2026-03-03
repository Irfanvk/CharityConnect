import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

const toDateInputValue = (value) => {
  if (!value) return '';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return '';
  return format(asDate, 'yyyy-MM-dd');
};

const getInitialFormData = (campaign) => {
  if (!campaign) {
    return {
      title: '',
      description: '',
      target_amount: '',
      min_amount: 100,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      status: 'active',
      image_url: ''
    };
  }

  return {
    title: campaign.title || '',
    description: campaign.description || '',
    target_amount: campaign.target_amount ?? '',
    min_amount: campaign.min_amount ?? 100,
    start_date: toDateInputValue(campaign.start_date),
    end_date: toDateInputValue(campaign.end_date),
    status: campaign.status || 'active',
    image_url: campaign.image_url || ''
  };
};

export default function CampaignForm({ open, onOpenChange, campaign, onSubmit }) {
  const [formData, setFormData] = useState(getInitialFormData(campaign));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(getInitialFormData(campaign));
  }, [open, campaign]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...formData,
      target_amount: Number(formData.target_amount) || 0,
      min_amount: parseFloat(formData.min_amount) || 100,
      collected_amount: campaign?.collected_amount || 0,
      participants_count: campaign?.participants_count || 0
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {campaign ? 'Edit Campaign' : 'Create Campaign'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Campaign Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Flood Relief Fund"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the campaign purpose..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Target Amount (₹) *</Label>
              <Input
                id="target_amount"
                type="number"
                value={formData.target_amount}
                onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                placeholder="50000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_amount">Minimum Donation (₹)</Label>
              <Input
                id="min_amount"
                type="number"
                value={formData.min_amount}
                onChange={(e) => setFormData({...formData, min_amount: e.target.value})}
                placeholder="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date 
                      ? format(new Date(formData.start_date), "PPP")
                      : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData({...formData, start_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date 
                      ? format(new Date(formData.end_date), "PPP")
                      : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? new Date(formData.end_date) : undefined}
                    onSelect={(date) => setFormData({...formData, end_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                  />
                </PopoverContent>
              </Popover>
            </div>
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL (Optional)</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title || !formData.target_amount || !formData.end_date}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {campaign ? 'Update' : 'Create'} Campaign
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}