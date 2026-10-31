import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { APP_BRAND } from "@/config/appPaths";
import { resolveThemeId } from "@/themes/presets";

export const BRANDING_QUERY_KEY = ["settings", "branding"];

export const BRANDING_DEFAULTS = {
  theme: "default",
  org_display_name: APP_BRAND.NAME,
  org_tagline: APP_BRAND.TAGLINE,
  org_logo_url: "",
  landing_headline: "",
  landing_subtext: "",
  landing_hero_image_url: "",
  login_welcome_text: "",
};

// Superadmin-only "Preview as member": lives in memory, so it never outlives the tab.
let previewTheme = null;
const listeners = new Set();

export function setPreviewTheme(themeId) {
  previewTheme = themeId ? resolveThemeId(themeId) : null;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePreviewTheme() {
  return useSyncExternalStore(subscribe, () => previewTheme, () => null);
}

// Non-React code (PDF/Excel generators) reads the last loaded organisation name from here.
let currentOrgName = APP_BRAND.NAME;
export const getOrgName = () => currentOrgName;

// Loaded once at startup and cached for 5 minutes; falls back to defaults if the call fails.
export function useBranding() {
  const { data, isError } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: () => charityClient.admin.getBranding(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const branding = { ...BRANDING_DEFAULTS };
  if (data && !isError) {
    Object.keys(BRANDING_DEFAULTS).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") branding[key] = data[key];
    });
  }
  currentOrgName = branding.org_display_name;
  return branding;
}

export function useOrgBrand() {
  const branding = useBranding();
  return {
    name: branding.org_display_name,
    tagline: branding.org_tagline,
    logoUrl: branding.org_logo_url,
    landingHeadline: branding.landing_headline,
    landingSubtext: branding.landing_subtext,
    heroImageUrl: branding.landing_hero_image_url,
    loginWelcomeText: branding.login_welcome_text,
    theme: resolveThemeId(branding.theme),
  };
}
