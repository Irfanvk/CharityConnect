import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Search, MoreVertical, MessageSquare, CheckCircle, 
  XCircle, Clock, AlertCircle, Loader2 
} from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-700", icon: XCircle },
};

const typeConfig = {
  approval: { label: "Approval Request", color: "text-purple-600" },
  question: { label: "Question", color: "text-blue-600" },
  complaint: { label: "Complaint", color: "text-rose-600" },
  suggestion: { label: "Suggestion", color: "text-emerald-600" },
  other: { label: "Other", color: "text-slate-600" },
};

export default function Requests() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    request_type: 'question',
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => base44.entities.Request.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Request.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setFormOpen(false);
      setFormData({ request_type: 'question', subject: '', message: '', priority: 'medium' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Request.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setResponseOpen(false);
      setSelectedRequest(null);
      setAdminResponse("");
    },
  });

  const isAdmin = user?.role === 'admin';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await createMutation.mutateAsync(formData);
    setLoading(false);
  };

  const handleResolve = async (status) => {
    setLoading(true);
    await updateMutation.mutateAsync({
      id: selectedRequest.id,
      data: {
        status,
        admin_response: adminResponse,
        resolved_by: user?.email,
        resolved_at: new Date().toISOString()
      }
    });
    setLoading(false);
  };

  // Filter requests based on user role
  let displayRequests = requests;
  if (!isAdmin) {
    displayRequests = requests.filter(r => r.created_by === user?.email);
  }

  const filteredRequests = displayRequests.filter(r => {
    const matchesSearch = 
      r.subject?.toLowerCase().includes(search.toLowerCase()) ||
      r.message?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Member Requests' : 'My Requests'}
          </h1>
          <p className="text-slate-500">
            {isAdmin ? 'Review and respond to member requests' : 'Submit requests to administrators'}
          </p>
        </div>
        {!isAdmin && (
          <Button 
            onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['pending', 'in_progress', 'resolved', 'rejected'].map((status) => {
          const config = statusConfig[status];
          const count = displayRequests.filter(r => r.status === status).length;
          return (
            <Card key={status} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <config.icon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs text-slate-500">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Requests Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                {isAdmin && <TableHead>Submitted By</TableHead>}
                <TableHead>Priority</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => {
                  const status = statusConfig[request.status];
                  const type = typeConfig[request.request_type];
                  return (
                    <TableRow key={request.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <span className={`text-sm font-medium ${type?.color}`}>
                          {type?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{request.subject}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{request.message}</p>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>{request.created_by}</TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className={
                          request.priority === 'high' ? 'border-rose-300 text-rose-700' :
                          request.priority === 'medium' ? 'border-amber-300 text-amber-700' :
                          'border-slate-300 text-slate-700'
                        }>
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.created_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={status?.color}>
                          {status?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedRequest(request); setResponseOpen(true); }}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Request Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Submit Request</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({...formData, request_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approval">Approval Request</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Brief summary of your request"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Detailed description of your request..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({...formData, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !formData.subject || !formData.message}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View/Respond Dialog */}
      <Dialog open={responseOpen} onOpenChange={setResponseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Type</Label>
                  <p className={`font-medium ${typeConfig[selectedRequest.request_type]?.color}`}>
                    {typeConfig[selectedRequest.request_type]?.label}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Subject</Label>
                  <p className="font-semibold text-slate-900">{selectedRequest.subject}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Message</Label>
                  <p className="text-slate-700">{selectedRequest.message}</p>
                </div>
                {isAdmin && (
                  <div>
                    <Label className="text-xs text-slate-500">Submitted By</Label>
                    <p className="text-slate-700">{selectedRequest.created_by}</p>
                  </div>
                )}
                <div className="flex gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Priority</Label>
                    <Badge variant="outline" className={
                      selectedRequest.priority === 'high' ? 'border-rose-300 text-rose-700' :
                      selectedRequest.priority === 'medium' ? 'border-amber-300 text-amber-700' :
                      'border-slate-300 text-slate-700'
                    }>
                      {selectedRequest.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Status</Label>
                    <Badge className={statusConfig[selectedRequest.status]?.color}>
                      {statusConfig[selectedRequest.status]?.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedRequest.admin_response && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Label className="text-xs text-emerald-700">Admin Response</Label>
                  <p className="text-slate-700 mt-1">{selectedRequest.admin_response}</p>
                  {selectedRequest.resolved_by && (
                    <p className="text-xs text-slate-500 mt-2">
                      Responded by {selectedRequest.resolved_by} on {format(new Date(selectedRequest.resolved_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}

              {isAdmin && selectedRequest.status !== 'resolved' && selectedRequest.status !== 'rejected' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="adminResponse">Your Response</Label>
                    <Textarea
                      id="adminResponse"
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Write your response..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleResolve('resolved')}
                      disabled={loading || !adminResponse}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Resolve
                    </Button>
                    <Button 
                      onClick={() => handleResolve('rejected')}
                      disabled={loading || !adminResponse}
                      variant="destructive"
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}