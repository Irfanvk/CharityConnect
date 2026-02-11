import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

export default function CampaignProgress({ campaigns }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-800">Active Campaigns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCampaigns.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No active campaigns</p>
        ) : (
          activeCampaigns.slice(0, 3).map((campaign) => {
            const progress = campaign.target_amount > 0 
              ? Math.min((campaign.collected_amount / campaign.target_amount) * 100, 100)
              : 0;
            
            return (
              <div key={campaign.id} className="p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{campaign.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        Ends {format(new Date(campaign.end_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    {progress.toFixed(0)}%
                  </Badge>
                </div>
                
                <Progress value={progress} className="h-2 mb-2" />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    ₹{(campaign.collected_amount || 0).toLocaleString()} raised
                  </span>
                  <span className="font-medium text-slate-800">
                    Goal: ₹{campaign.target_amount.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                  <Users className="w-3 h-3" />
                  {campaign.participants_count || 0} participants
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}