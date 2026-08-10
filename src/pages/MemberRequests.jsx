import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format } from "@/lib/dateTime";
import { Loader2, Trash2 } from "lucide-react";

const statusColor = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const typeLabel = {
  monthly_amount_change: "Monthly Change",
  profile_update: "Profile Update",
  complaint: "Complaint",
  suggestion: "Suggestion",
  general: "General",
};

export default function MemberRequests() {
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.requests.mine(statusFilter),
    queryFn: () =>
      charityClient.requests.list({
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        limit: 200,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId) => charityClient.requests.cancel(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast({
        title: "Request cancelled",
        description: "Your pending request was cancelled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to cancel request",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
        <p className="text-slate-500">Track your submitted requests and admin responses.</p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">Loading requests...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">
            No requests yet. Use Request Change to submit your first request.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((request) => (
            <Card key={request.id} className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{typeLabel[request.request_type] || request.request_type}</Badge>
                      <Badge className={statusColor[request.status] || "bg-slate-100 text-slate-700"}>
                        {request.status}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">{request.subject || "Request"}</h3>
                    <p className="text-sm text-slate-600 mt-1">{request.message}</p>
                  </div>
                  {request.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelMutation.mutate(request.id)}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Cancel
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  Submitted {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                </div>

                {request.status === "approved" && request.resolved_at && (
                  <p className="text-xs text-emerald-700">Applied on {format(new Date(request.resolved_at), "MMM d, yyyy")}</p>
                )}

                {request.status === "rejected" && (
                  <p className="text-xs text-rose-700">Reason: {request.rejection_reason || "No reason provided"}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
