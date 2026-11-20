import React from "react";
import { Upload, FileText, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

// Checks a chosen proof file; returns an error sentence, or "" when it is fine.
export function proofFileProblem(file, maxUploadMb) {
  if (!PROOF_TYPES.includes(file.type)) return "Please choose a JPG, PNG or PDF file.";
  if (file.size > maxUploadMb * 1024 * 1024) return `This file is too large. The limit is ${maxUploadMb}MB.`;
  return "";
}

// File picker for a payment proof, or the chosen file with a remove button.
export default function ProofPicker({ file, onPick, onClear, prompt, maxUploadMb, error }) {
  return (
    <>
      {!file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-6 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-sm text-slate-700 font-medium">{prompt}</span>
          <span className="text-xs text-slate-400 mt-1">JPG, PNG, PDF up to {maxUploadMb}MB</span>
          <input
            type="file"
            accept={PROOF_TYPES.join(",")}
            onChange={(e) => { onPick(e.target.files?.[0] || null); e.target.value = ""; }}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            {file.type === "application/pdf" ? (
              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{Math.max(1, Math.round(file.size / 1024))} KB</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </>
  );
}
