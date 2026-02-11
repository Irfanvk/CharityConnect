import React from "react";
import { Card } from "@/components/ui/card";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "emerald" }) {
  const colorClasses = {
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
    blue: "from-blue-500 to-indigo-600 shadow-blue-500/30",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/30",
    rose: "from-rose-500 to-pink-600 shadow-rose-500/30",
    purple: "from-purple-500 to-violet-600 shadow-purple-500/30",
  };

  return (
    <Card className="relative overflow-hidden border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
            {trend && (
              <div className={`text-sm font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend > 0 ? '+' : ''}{trend}% from last month
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[color]}`} />
    </Card>
  );
}