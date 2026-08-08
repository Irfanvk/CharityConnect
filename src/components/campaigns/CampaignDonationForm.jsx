import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Heart } from "lucide-react";

const getInitialFormData = (campaign) => ({
    amount: campaign?.min_amount || 100,
    payment_method: "upi",
});

export default function CampaignDonationForm({ open, onOpenChange, campaign, onSubmit }) {
    const [formData, setFormData] = useState(() => getInitialFormData(campaign));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setFormData(getInitialFormData(campaign));
        }
    }, [open, campaign]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                amount: Number(formData.amount),
                payment_method: formData.payment_method || null,
            });
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    const minAmount = campaign?.min_amount || 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Donate to Campaign</DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Support {campaign?.title || "this campaign"} with a one-time donation.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        <div className="flex items-start gap-2">
                            <Heart className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                This donation is recorded immediately in your contribution history and campaign statements.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Donation Amount (₹) *</Label>
                        <Input
                            id="amount"
                            type="number"
                            min={minAmount}
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="Enter amount"
                            required
                        />
                        <p className="text-xs text-slate-500">Minimum: ₹{minAmount}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select
                            value={formData.payment_method}
                            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || Number(formData.amount) < minAmount}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Donate Now
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
