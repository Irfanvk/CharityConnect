import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, Pause, Play, X } from "lucide-react";
import { format } from "date-fns";

export default function RecurringDonations({ recurringDonations, user }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecurringDonation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurringDonations'] }),
  });

  const statusConfig = {
    active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
    paused: { label: "Paused", color: "bg-amber-100 text-amber-700" },
    cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700" },
  };

  const handlePause = (donation) => {
    updateMutation.mutate({ 
      id: donation.id, 
      data: { status: 'paused' }
    });
  };

  const handleResume = (donation) => {
    updateMutation.mutate({ 
      id: donation.id, 
      data: { status: 'active' }
    });
  };

  const handleCancel = (donation) => {
    if (confirm('Are you sure you want to cancel this recurring donation?')) {
      updateMutation.mutate({ 
        id: donation.id, 
        data: { status: 'cancelled' }
      });
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          Recurring Donations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recurringDonations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No recurring donations set up</p>
            <p className="text-sm mt-1">Visit Campaigns to support a cause</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringDonations.map((donation) => {
              const status = statusConfig[donation.status];
              return (
                <div 
                  key={donation.id} 
                  className="p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{donation.campaign_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={status.color}>{status.label}</Badge>
                        <Badge variant="outline" className="capitalize">
                          {donation.frequency}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">₹{donation.amount}</p>
                      <p className="text-xs text-slate-500">{donation.frequency}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <p className="text-xs text-slate-500">Next donation</p>
                        <p className="font-medium">
                          {donation.next_donation_date 
                            ? format(new Date(donation.next_donation_date), 'MMM d, yyyy')
                            : 'Not scheduled'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total donated</p>
                      <p className="font-medium text-slate-900">
                        ₹{donation.total_donated || 0} ({donation.donation_count || 0} times)
                      </p>
                    </div>
                  </div>

                  {donation.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {donation.status === 'active' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handlePause(donation)}
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResume(donation)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCancel(donation)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}