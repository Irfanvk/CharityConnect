import React, { useState, useRef } from "react";
import { charityClient } from "@/api/charityClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Upload, AlertTriangle, CheckCircle2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

export default function Import() {
  const [step, setStep] = useState(1);
  const [memberFile, setMemberFile] = useState(null);
  const [challanFile, setChallanFile] = useState(null);
  const [campaignFile, setCampaignFile] = useState(null);
  const [memberPreview, setMemberPreview] = useState(null);
  const [challanPreview, setChallanPreview] = useState(null);
  const [campaignPreview, setCampaignPreview] = useState(null);
  const [memberProgress, setMemberProgress] = useState(null);
  const [challanProgress, setChallanProgress] = useState(null);
  const [campaignProgress, setCampaignProgress] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const memberFileInputRef = useRef(null);
  const challanFileInputRef = useRef(null);
  const campaignFileInputRef = useRef(null);

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          if (typeof text !== 'string') {
            throw new Error('Failed to read file');
          }
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, i) => {
              row[h] = values[i] || '';
            });
            return row;
          });
          resolve({ headers, rows: rows.slice(0, 3) });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (file, type) => {
    try {
      const preview = await parseCSV(file);
      if (type === 'member') {
        setMemberFile(file);
        setMemberPreview(preview);
      } else if (type === 'challan') {
        setChallanFile(file);
        setChallanPreview(preview);
      } else if (type === 'campaign') {
        setCampaignFile(file);
        setCampaignPreview(preview);
      }
    } catch (err) {
      toast({
        title: "File parse error",
        description: `Unable to parse ${type} CSV: ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-emerald-500', 'bg-emerald-50');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-50');
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-50');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file, type);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  };

  const updateProgress = (setter) => (progressInfo = {}) => {
    const nextPercent = Number(progressInfo?.percent);
    setter((current) => {
      if (!current) return current;
      if (!Number.isFinite(nextPercent)) return current;
      const mappedPercent = Math.max(5, Math.min(95, nextPercent));
      return { ...current, percent: mappedPercent, status: "Uploading..." };
    });
  };

  const finalizeProgress = (setter, status) => {
    setter((current) => {
      if (!current) return current;
      return {
        ...current,
        percent: status === "failed" ? Math.max(5, current.percent || 5) : 100,
        status: status === "failed" ? "Failed" : "Completed",
      };
    });
  };

  const memberImportMutation = useMutation({
    mutationFn: async () => {
      setMemberProgress({ percent: 0, status: "Starting..." });
      return charityClient.members.importFromFile(memberFile, {
        onUploadProgress: updateProgress(setMemberProgress),
      });
    },
    onSuccess: (summary) => {
      finalizeProgress(setMemberProgress, "success");
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setImportResults(prev => prev ? { ...prev, member: summary } : { member: summary });
    },
    onError: (error) => {
      finalizeProgress(setMemberProgress, "failed");
      toast({
        title: "Member import failed",
        description: error?.message || "Unable to import members",
        variant: "destructive",
      });
    },
  });

  const challanImportMutation = useMutation({
    mutationFn: async () => {
      setChallanProgress({ percent: 0, status: "Starting..." });
      return charityClient.challans.importHistoryFromFile(challanFile, {
        onUploadProgress: updateProgress(setChallanProgress),
      });
    },
    onSuccess: (summary) => {
      finalizeProgress(setChallanProgress, "success");
      queryClient.invalidateQueries({ queryKey: ["challans"] });
      setImportResults(prev => prev ? { ...prev, challan: summary } : { challan: summary });
    },
    onError: (error) => {
      finalizeProgress(setChallanProgress, "failed");
      toast({
        title: "Challan import failed",
        description: error?.message || "Unable to import challans",
        variant: "destructive",
      });
    },
  });

  const campaignImportMutation = useMutation({
    mutationFn: async () => {
      setCampaignProgress({ percent: 0, status: "Starting..." });
      return charityClient.campaigns.importPaymentsFromFile(campaignFile, {
        onUploadProgress: updateProgress(setCampaignProgress),
      });
    },
    onSuccess: (summary) => {
      finalizeProgress(setCampaignProgress, "success");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["challans"] });
      setImportResults(prev => prev ? { ...prev, campaign: summary } : { campaign: summary });
    },
    onError: (error) => {
      finalizeProgress(setCampaignProgress, "failed");
      toast({
        title: "Campaign import failed",
        description: error?.message || "Unable to import campaigns",
        variant: "destructive",
      });
    },
  });

  const handleConfirmImport = async () => {
    setStep(3);
    try {
      await memberImportMutation.mutateAsync();
      if (challanFile) await challanImportMutation.mutateAsync();
      if (campaignFile) await campaignImportMutation.mutateAsync();
    } catch (err) {
      // Handled by mutation callbacks
    }
  };

  const isImporting = memberImportMutation.isPending || challanImportMutation.isPending || campaignImportMutation.isPending;
  const isImportComplete = memberProgress?.percent === 100 && (!challanFile || challanProgress?.percent === 100) && (!campaignFile || campaignProgress?.percent === 100);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Import Wizard</h1>
        <p className="text-slate-500 mt-1">Import members, challenges, and campaign payments</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              s <= step
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-1 mx-2 ${
                s < step ? 'bg-emerald-600' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Files */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block font-semibold text-slate-900">Members CSV <span className="text-rose-600">*</span></label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'member')}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => memberFileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-slate-900">Drag CSV file here</p>
              <p className="text-sm text-slate-500">or click to browse</p>
              {memberFile && <p className="text-xs text-emerald-600 mt-2">✓ {memberFile.name}</p>}
            </div>
            <input
              ref={memberFileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'member')}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-900">Challan History CSV <span className="text-slate-400">(optional)</span></label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'challan')}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => challanFileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-slate-900">Drag CSV file here</p>
              <p className="text-sm text-slate-500">or click to browse</p>
              {challanFile && <p className="text-xs text-emerald-600 mt-2">✓ {challanFile.name}</p>}
            </div>
            <input
              ref={challanFileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'challan')}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-900">Campaign Payments CSV <span className="text-slate-400">(optional)</span></label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'campaign')}
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => campaignFileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-slate-900">Drag CSV file here</p>
              <p className="text-sm text-slate-500">or click to browse</p>
              {campaignFile && <p className="text-xs text-emerald-600 mt-2">✓ {campaignFile.name}</p>}
            </div>
            <input
              ref={campaignFileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'campaign')}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => setStep(2)}
              disabled={!memberFile}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div className="space-y-4">
          {memberPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {memberPreview.headers.map(h => (
                          <th key={h} className="text-left py-2 px-2 font-semibold text-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memberPreview.rows.map((row, i) => (
                        <tr key={i} className="border-b">
                          {memberPreview.headers.map(h => (
                            <td key={`${i}-${h}`} className="py-2 px-2 text-slate-600">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">Showing first 3 rows</p>
              </CardContent>
            </Card>
          )}

          {challanPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Challan History Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {challanPreview.headers.map(h => (
                          <th key={h} className="text-left py-2 px-2 font-semibold text-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {challanPreview.rows.map((row, i) => (
                        <tr key={i} className="border-b">
                          {challanPreview.headers.map(h => (
                            <td key={`${i}-${h}`} className="py-2 px-2 text-slate-600">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">Showing first 3 rows</p>
              </CardContent>
            </Card>
          )}

          {campaignPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Payments Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-sky-200 bg-sky-50 p-3 rounded-md mb-3 flex gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-sky-700 flex-shrink-0 mt-0.5" />
                  <div className="text-sky-800">
                    <p className="font-semibold">Note:</p>
                    <p>If campaign payments are detected, required campaigns must exist before import. A campaign named "Inaugural Donation — POYYATHABAIL JAMA'ATH GCC COMMITTEE" may be required.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {campaignPreview.headers.map(h => (
                          <th key={h} className="text-left py-2 px-2 font-semibold text-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaignPreview.rows.map((row, i) => (
                        <tr key={i} className="border-b">
                          {campaignPreview.headers.map(h => (
                            <td key={`${i}-${h}`} className="py-2 px-2 text-slate-600">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">Showing first 3 rows</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleConfirmImport}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirm Import <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Upload Progress & Results */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Member Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Members
                {memberProgress?.percent === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={memberProgress?.percent || 0} className="h-2" />
              <p className="text-xs text-slate-600">{memberProgress?.status || 'Pending...'}</p>
              {importResults?.member && (
                <div className="space-y-1 text-xs">
                  <p><Badge variant="outline">Total: {importResults.member.total_rows}</Badge></p>
                  <p><Badge className="bg-emerald-100 text-emerald-800">Created: {importResults.member.members_created}</Badge></p>
                  <p><Badge variant="outline">Linked: {importResults.member.members_linked_existing}</Badge></p>
                  {(importResults.member.errors || []).length > 0 && (
                    <p><Badge variant="destructive">Errors: {importResults.member.errors.length}</Badge></p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {challanFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Challans
                  {challanProgress?.percent === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={challanProgress?.percent || 0} className="h-2" />
                <p className="text-xs text-slate-600">{challanProgress?.status || 'Pending...'}</p>
                {importResults?.challan && (
                  <div className="space-y-1 text-xs">
                    <p><Badge variant="outline">Total: {importResults.challan.total_rows}</Badge></p>
                    <p><Badge className="bg-emerald-100 text-emerald-800">Created: {importResults.challan.challans_created}</Badge></p>
                    <p><Badge variant="outline">Linked: {importResults.challan.members_linked_existing}</Badge></p>
                    {(importResults.challan.errors || []).length > 0 && (
                      <p><Badge variant="destructive">Errors: {importResults.challan.errors.length}</Badge></p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {campaignFile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Campaigns
                  {campaignProgress?.percent === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={campaignProgress?.percent || 0} className="h-2" />
                <p className="text-xs text-slate-600">{campaignProgress?.status || 'Pending...'}</p>
                {importResults?.campaign && (
                  <div className="space-y-1 text-xs">
                    <p><Badge variant="outline">Total: {importResults.campaign.total_rows}</Badge></p>
                    <p><Badge className="bg-emerald-100 text-emerald-800">Campaigns: {importResults.campaign.campaigns_created}</Badge></p>
                    <p><Badge className="bg-emerald-100 text-emerald-800">Challans: {importResults.campaign.challans_created}</Badge></p>
                    {(importResults.campaign.errors || []).length > 0 && (
                      <p><Badge variant="destructive">Errors: {importResults.campaign.errors.length}</Badge></p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isImporting && (
            <div className="flex items-center justify-center py-4 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Uploading...
            </div>
          )}

          {isImportComplete && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
