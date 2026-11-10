import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";

// Mirrors the backend registry defaults; used until /settings/public loads.
export const PUBLIC_SETTINGS_DEFAULTS = {
  proof_max_upload_mb: 5,
  upcoming_months_payable: 3,
  max_months_per_payment: 12,
  default_campaign_min_amount: 100,
  member_stats_visible: false,
};

export const PUBLIC_SETTINGS_QUERY_KEY = ["settings", "public"];

export function usePublicSettings() {
  const { data } = useQuery({
    queryKey: PUBLIC_SETTINGS_QUERY_KEY,
    queryFn: () => charityClient.admin.getPublicSettings(),
    staleTime: 5 * 60 * 1000,
  });
  return { ...PUBLIC_SETTINGS_DEFAULTS, ...(data || {}) };
}
