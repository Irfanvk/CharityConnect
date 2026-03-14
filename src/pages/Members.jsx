import React, { useRef, useState } from "react";
import { charityClient } from "@/api/charityClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
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
import { Plus, Search, MoreVertical, Pencil, Trash2, Phone, Mail, UserCheck, UserX, Ban, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import MemberForm from "@/components/members/MemberForm";

const statusConfig = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactive", color: "bg-slate-100 text-slate-700" },
  suspended: { label: "Suspended", color: "bg-rose-100 text-rose-700" },
};

export default function Members() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [user, setUser] = useState(null);
  const [includeDonations, setIncludeDonations] = useState(true);
  const editFetchErrorShownForId = useRef(null);
  const importFileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'superadmin';

  const handleFormOpenChange = (open) => {
    setFormOpen(open);
    if (!open) {
      setEditingMember(null);
    }
  };

  React.useEffect(() => {
    charityClient.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => charityClient.members.list({ order: '-created_date' }),
  });

  const {
    data: editingMemberDetails,
    isLoading: isEditingMemberLoading,
    isError: isEditingMemberError,
    error: editingMemberError,
  } = useQuery({
    queryKey: ['member', editingMember?.id],
    queryFn: () => charityClient.members.get(editingMember.id),
    enabled: Boolean(formOpen && editingMember?.id),
  });

  React.useEffect(() => {
    if (!formOpen || !editingMember?.id) {
      editFetchErrorShownForId.current = null;
      return;
    }

    if (isEditingMemberError && editFetchErrorShownForId.current !== editingMember.id) {
      toast({
        title: "Unable to load member details",
        description: editingMemberError?.message || "Please try again.",
        variant: "destructive",
      });
      editFetchErrorShownForId.current = editingMember.id;
    }
  }, [formOpen, editingMember?.id, isEditingMemberError, editingMemberError, toast]);

  const createMutation = useMutation({
    mutationFn: async (/** @type {any} */ data) => {
      const member = await charityClient.members.create(data);
      // Log audit
      await charityClient.auditLogs.create({
        action_type: "member_created",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Member",
        target_id: member?.['id'],
        target_name: data.full_name,
        details: { member_id: data.member_id }
      });
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (/** @type {any} */ payload) => {
      const { id, data, logStatusChange = false, oldStatus = null } = payload || {};
      const member = await charityClient.members.update(id, data);
      // Log audit
      const actionType = logStatusChange ? "member_status_changed" : "member_updated";
      const details = logStatusChange ? { old_status: oldStatus, new_status: data.status } : {};
      await charityClient.auditLogs.create({
        action_type: actionType,
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Member",
        target_id: id,
        target_name: member?.['full_name'],
        details
      });
      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setFormOpen(false);
      setEditingMember(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (/** @type {any} */ payload) => {
      const { id, name } = payload || {};
      await charityClient.members.delete(id);
      // Log audit
      await charityClient.auditLogs.create({
        action_type: "member_deleted",
        performed_by: user?.email,
        performed_by_name: user?.full_name,
        target_type: "Member",
        target_id: id,
        target_name: name
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });

  const importMutation = useMutation({
    mutationFn: async (/** @type {any} */ payload) => {
      const { file, includeDonationsFlag } = payload || {};
      return charityClient.members.importFromFile(file, {
        includeDonations: includeDonationsFlag,
      });
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      const total = summary?.total_rows ?? 0;
      const created = summary?.members_created ?? 0;
      const linked = summary?.members_linked_existing ?? 0;
      const challans = summary?.challans_created ?? 0;
      const skipped = summary?.rows_skipped ?? 0;
      toast({
        title: "Member import completed",
        description: `Rows: ${total}, Created: ${created}, Linked: ${linked}, Donations: ${challans}, Skipped: ${skipped}`,
      });

      const errorList = Array.isArray(summary?.errors) ? summary.errors : [];
      if (errorList.length > 0) {
        toast({
          title: "Some rows were skipped",
          description: errorList.slice(0, 3).join(" | "),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error?.message || "Unable to import members file",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data) => {
    if (editingMember) {
      await updateMutation.mutateAsync({ id: editingMember.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleImportClick = () => {
    if (!isSuperAdmin) return;
    importFileInputRef.current?.click();
  };

  const handleImportFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx')) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a .csv or .xlsx file",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    await importMutation.mutateAsync({
      file,
      includeDonationsFlag: includeDonations,
    });

    event.target.value = '';
  };

  const getSuggestedId = () => {
    if (members.length === 0) return "MEM-001";
    const ids = members.map(m => {
      const match = m.member_id?.match(/MEM-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxId = Math.max(...ids, 0);
    return `MEM-${String(maxId + 1).padStart(3, '0')}`;
  };

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.member_id?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
          <p className="text-slate-500">Manage your charity members</p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeDonations}
                onChange={(e) => setIncludeDonations(e.target.checked)}
              />
              Include donation history
            </label>

            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleImportFileSelected}
            />

            <Button
              type="button"
              variant="outline"
              onClick={handleImportClick}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import Members
            </Button>

            <Button 
              onClick={() => { setEditingMember(null); setFormOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {members.filter(m => m.status === 'active').length}
                </p>
                <p className="text-sm text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <UserX className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {members.filter(m => m.status !== 'active').length}
                </p>
                <p className="text-sm text-slate-500">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, ID, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Monthly Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Loading members...
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                          {member.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{member.full_name}</p>
                          <p className="text-sm text-slate-500">{member.member_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3 h-3" />
                          {member.phone}
                        </div>
                        {member.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.join_date && format(new Date(member.join_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">₹{member.monthly_amount || 100}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[member.status]?.color || statusConfig.active.color}>
                        {statusConfig[member.status]?.label || 'Active'}
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
                          <DropdownMenuItem onClick={() => { setEditingMember(member); setFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          
                          {/* Status toggle for all admins */}
                          {member.status === 'active' ? (
                            <DropdownMenuItem 
                              onClick={() => updateMutation.mutate({ 
                                id: member.id, 
                                data: { status: 'inactive' },
                                logStatusChange: true,
                                oldStatus: 'active'
                              })}
                              className="text-amber-600"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Mark Inactive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => updateMutation.mutate({ 
                                id: member.id, 
                                data: { status: 'active' },
                                logStatusChange: true,
                                oldStatus: member.status
                              })}
                              className="text-emerald-600"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Mark Active
                            </DropdownMenuItem>
                          )}
                          
                          {/* Delete only for super admins */}
                          {isSuperAdmin && (
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate({ id: member.id, name: member.full_name })}
                              className="text-rose-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Member Form */}
      <MemberForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        member={editingMemberDetails || editingMember}
        isFetchingMember={Boolean(editingMember?.id) && isEditingMemberLoading}
        onSubmit={handleSubmit}
        suggestedId={getSuggestedId()}
        existingMembers={members}
      />
    </div>
  );
}