import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  CalendarDays,
  CalendarRange,
  Calendar,
  TrendingUp,
  Wallet,
} from "lucide-react";

const periodConfig = [
  { key: "today", label: "Today", icon: CalendarDays, gradient: "from-blue-500 to-cyan-600", bg: "from-blue-50 to-cyan-50" },
  { key: "this_week", label: "This Week", icon: CalendarRange, gradient: "from-indigo-500 to-violet-600", bg: "from-indigo-50 to-violet-50" },
  { key: "this_month", label: "This Month", icon: Calendar, gradient: "from-emerald-500 to-teal-600", bg: "from-emerald-50 to-teal-50" },
  { key: "this_year", label: "This Year", icon: TrendingUp, gradient: "from-amber-500 to-orange-600", bg: "from-amber-50 to-orange-50" },
  { key: "all_time", label: "All Time", icon: Wallet, gradient: "from-rose-500 to-pink-600", bg: "from-rose-50 to-pink-50" },
];

export default function CollectionStats({ collectionStats, compact = false }) {
  const stats = collectionStats || { today: 0, this_week: 0, this_month: 0, this_year: 0, all_time: 0 };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
            Collection Overview
          </CardTitle>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"}`}>
          {periodConfig.map(({ key, label, icon: Icon, gradient, bg }) => (
            <div
              key={key}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${bg} p-4 transition-shadow hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ₹{stats[key].toLocaleString()}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
