import React, { useState } from "react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function ProfileCompletionModal({ open, member, onComplete }) {
  const [internalOpen, setInternalOpen] = useState(open);
  const [formData, setFormData] = useState({
    address: member?.address || '',
    city: member?.city || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    await charityClient.entities.Member.update(member.id, {
      ...formData,
      notes: null // Clear the incomplete profile note
    });
    
    setLoading(false);
    setInternalOpen(false);
  };

  return (
    <Dialog open={internalOpen} onOpenChange={(newOpen) => {
      setInternalOpen(newOpen);
      if (!newOpen) onComplete();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide additional details to complete your registration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Enter your full address"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              placeholder="Enter your city"
              required
            />
          </div>

          <Button 
            type="submit"
            disabled={loading || !formData.address || !formData.city}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Complete Profile
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}