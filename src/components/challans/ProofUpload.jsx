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
import { Upload, Loader2, X, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ProofUpload({ open, onOpenChange, challan, onSubmit }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (3MB max as per backend requirement)
      if (selectedFile.size > 3 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 3MB. Please choose a smaller file.",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      
      // Validate file type (backend accepts jpg, png, pdf)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPG, PNG, and PDF files are allowed.",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      
      // Only create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview('pdf'); // Indicate PDF file
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      if (!challan?.id) {
        throw new Error('Invalid challan selected for proof upload.');
      }

      const uploaded = await charityClient.challans.uploadProof(challan.id, file);
      if (typeof onSubmit === 'function') {
        await onSubmit(uploaded);
      }
      
      setFile(null);
      setPreview(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                <span className="text-xs text-slate-400 mt-1">JPG, PNG, PDF up to 3MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                {preview === 'pdf' ? (
                  <div className="w-full h-48 flex items-center justify-center bg-slate-100 rounded-xl">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 font-medium">{file.name}</p>
                      <p className="text-xs text-slate-400">PDF Document</p>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-xl"
                  />
                )}
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
