import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Globe, Loader2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { PAGE_PATHS } from "@/config/appPaths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Admins and superadmins: how many members live in each country. */
export default function MembersByCountryCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["members", "country-stats"],
    queryFn: () => charityClient.members.countryStats(),
    staleTime: 60 * 1000,
  });

  const countries = data?.countries || [];
  const total = Number(data?.total || 0);
  const notSet = Number(data?.not_set || 0);
  const pct = (n) => {
    const p = total ? (n / total) * 100 : 0;
    return n > 0 && p < 1 ? "<1" : Math.round(p);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5 text-emerald-600" />
          Members by country
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
        ) : isError ? (
          <p className="py-4 text-sm text-rose-600">Could not load the country counts.</p>
        ) : (
          <div className="space-y-1">
            {countries.length === 0 && <p className="py-2 text-sm text-slate-500">No member has entered a country yet.</p>}
            {countries.map((c) => (
              <div key={c.country} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm odd:bg-slate-50 dark:odd:bg-slate-800/50">
                <span className="truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                <span className="shrink-0 tabular-nums font-medium text-slate-900 dark:text-white">
                  {c.count} <span className="font-normal text-slate-400">· {pct(c.count)}%</span>
                </span>
              </div>
            ))}
            {notSet > 0 && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm text-amber-800">
                <span>Not entered yet</span>
                <span className="tabular-nums font-medium">{notSet}</span>
              </div>
            )}
            <p className="pt-2 text-xs text-slate-500">
              Members are asked for their country and city when they sign in.{" "}
              <Link to={PAGE_PATHS.MEMBERS} className="text-emerald-700 hover:underline">Filter the members list</Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
