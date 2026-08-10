import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { getCampaignEndDateMode, getCampaignTargetMode } from "@/lib/campaigns";
import { format } from "@/lib/dateTime";
import { ImagePlus, Loader2, X } from "lucide-react";
import { charityClient } from "@/api/charityClient";

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
      target_mode: 'targeted',
      target_amount: '',
      min_amount: 100,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date_mode: 'fixed',
      end_date: '',
      status: 'active',
      image_url: ''
    };
  }

  return {
    title: campaign.title || '',
    description: campaign.description || '',
    target_mode: getCampaignTargetMode(campaign),
    target_amount: campaign.target_amount ?? '',
    min_amount: campaign.min_amount ?? 100,
    start_date: toDateInputValue(campaign.start_date),
    end_date_mode: getCampaignEndDateMode(campaign),
    end_date: toDateInputValue(campaign.end_date),
    status: campaign.status || 'active',
    image_url: campaign.image_url || ''
  };
};

export default function CampaignForm({ open, onOpenChange, campaign, onSubmit }) {
  const [formData, setFormData] = useState(getInitialFormData(campaign));
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(campaign?.image_url || null);
  const [uploadedCampaignId, setUploadedCampaignId] = useState(campaign?.id || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFormData(getInitialFormData(campaign));
    setDateError("");
    setImagePreview(campaign?.image_url || null);
    setUploadedCampaignId(campaign?.id || null);
  }, [open, campaign]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasFixedEndDate && formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      setDateError("End date cannot be before start date.");
      return;
    }

    setDateError("");
    setLoading(true);
    const result = await onSubmit({
      ...formData,
      target_amount: formData.target_mode === 'unlimited'
        ? null
        : (Number(formData.target_amount) || 0),
      min_amount: parseFloat(formData.min_amount) || 100,
      end_date: formData.end_date_mode === 'open' ? null : (formData.end_date || null),
      collected_amount: campaign?.collected_amount || 0,
      participants_count: campaign?.participants_count || 0,
      image_url: imagePreview || formData.image_url || undefined,
    });

    // If a file was staged for a new campaign, upload it now that we have the ID
    if (result?.id && pendingImageFile) {
      await _uploadImageFile(pendingImageFile, result.id);
    }
    setLoading(false);
  };

  // Staged file for new campaigns (we need the campaign ID first)
  const [pendingImageFile, setPendingImageFile] = useState(null);

  const _uploadImageFile = async (file, campaignId) => {
    try {
      setImageUploading(true);
      const formPayload = new FormData();
      formPayload.append("file", file);
      const updated = await charityClient.campaigns.uploadImage(campaignId, file);
      if (updated?.image_url) {
        setImagePreview(updated.image_url);
        setFormData((prev) => ({ ...prev, image_url: updated.image_url }));
      }
    } catch {
      // silently skip — form submission already succeeded
    } finally {
      setImageUploading(false);
      setPendingImageFile(null);
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately
    setImagePreview(URL.createObjectURL(file));

    if (campaign?.id) {
      // Edit mode: upload immediately
      await _uploadImageFile(file, campaign.id);
    } else {
      // Create mode: stage for after submission
      setPendingImageFile(file);
    }
    e.target.value = '';
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setPendingImageFile(null);
    setFormData((prev) => ({ ...prev, image_url: '' }));
  };

  const isTargeted = formData.target_mode === 'targeted';
  const hasFixedEndDate = formData.end_date_mode === 'fixed';

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

          <div className="space-y-3">
            <Label>Campaign Goal</Label>
            <RadioGroup
              value={formData.target_mode}
              onValueChange={(value) => setFormData({ ...formData, target_mode: value })}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <RadioGroupItem value="targeted" id="targeted-goal" className="mt-1" />
                <div>
                  <p className="font-medium text-slate-900">Targeted amount</p>
                  <p className="text-xs text-slate-500">Set a campaign goal and track progress against it.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <RadioGroupItem value="unlimited" id="unlimited-goal" className="mt-1" />
                <div>
                  <p className="font-medium text-slate-900">Unlimited amount</p>
                  <p className="text-xs text-slate-500">Keep collecting without a fixed funding cap.</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Target Amount (₹){isTargeted ? ' *' : ''}</Label>
              <Input
                id="target_amount"
                type="number"
                value={formData.target_amount}
                onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                placeholder={isTargeted ? '50000' : 'Unlimited'}
                required={isTargeted}
                disabled={!isTargeted}
              />
              {!isTargeted && (
                <p className="text-xs text-slate-500">Unlimited campaigns do not require a goal amount.</p>
              )}
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

          <div className="space-y-3">
            <Label>Campaign Duration</Label>
            <RadioGroup
              value={formData.end_date_mode}
              onValueChange={(value) => setFormData({ ...formData, end_date_mode: value, end_date: value === 'open' ? '' : formData.end_date })}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <RadioGroupItem value="fixed" id="fixed-end-date" className="mt-1" />
                <div>
                  <p className="font-medium text-slate-900">Fixed end date</p>
                  <p className="text-xs text-slate-500">Campaign closes on a specific date.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <RadioGroupItem value="open" id="open-end-date" className="mt-1" />
                <div>
                  <p className="font-medium text-slate-900">No end date</p>
                  <p className="text-xs text-slate-500">Campaign stays open until you manually change it.</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <DatePickerField
                id="campaign_start_date"
                value={formData.start_date}
                onChange={(next) => {
                  setDateError("");
                  setFormData((prev) => ({
                    ...prev,
                    start_date: next,
                    end_date:
                      prev.end_date && next && prev.end_date < next
                        ? next
                        : prev.end_date,
                  }));
                }}
                size="large"
                placeholder="Pick date"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date{hasFixedEndDate ? ' *' : ''}</Label>
              <DatePickerField
                id="campaign_end_date"
                value={formData.end_date}
                onChange={(next) => {
                  setDateError("");
                  setFormData({ ...formData, end_date: next });
                }}
                size="large"
                placeholder={hasFixedEndDate ? "Pick date" : "No end date"}
                disabled={!hasFixedEndDate}
                minDate={formData.start_date || undefined}
                allowClear={hasFixedEndDate}
              />
              {dateError && <p className="text-xs text-rose-600">{dateError}</p>}
              {!hasFixedEndDate && (
                <p className="text-xs text-slate-500">This campaign will remain open until you update its status or duration.</p>
              )}
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
            <Label>Campaign Image (Optional)</Label>

            {/* Preview */}
            {imagePreview && (
              <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={imagePreview}
                  alt="Campaign preview"
                  className="w-full h-full object-cover"
                  onError={() => setImagePreview(null)}
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {imageUploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
            >
              {imageUploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                : <><ImagePlus className="w-4 h-4 mr-2" />{imagePreview ? 'Change Photo' : 'Upload Photo'}</>
              }
            </Button>

            {/* OR URL input */}
            {!imagePreview && (
              <>
                <p className="text-xs text-center text-slate-400">or paste an image URL</p>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    setImagePreview(e.target.value || null);
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title || (isTargeted && !formData.target_amount) || (hasFixedEndDate && !formData.end_date)}
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