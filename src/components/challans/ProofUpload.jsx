import React, { useState } from "react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Loader2, Image, X, CheckCircle } from "lucide-react";

export default function ProofUpload({ open, onOpenChange, challan, onSubmit }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    const { file_url } = await charityClient.integrations?.Core?.UploadFile?.({ file }) || {};
    await onSubmit({
      proof_url: file_url,
      proof_uploaded_at: new Date().toISOString(),
      status: 'proof_uploaded'
    });
    setLoading(false);
    setFile(null);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload Payment Proof</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {challan && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Challan:</span> {challan.challan_number}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Amount:</span> ₹{challan.amount}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Screenshot/Receipt</Label>
            
            {!preview ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <span className="text-sm text-slate-600">Click to upload proof</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-xl"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => { setFile(null); setPreview(null); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!file || loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Upload Proof
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}