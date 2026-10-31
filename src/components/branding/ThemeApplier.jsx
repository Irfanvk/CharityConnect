import { useEffect } from "react";
import { buildThemeCss } from "@/themes/presets";
import { useBranding, usePreviewTheme } from "@/lib/branding";

const STYLE_ID = "seasonal-theme-vars";

// Applies the resolved (or previewed) theme as CSS variables and keeps the browser title in sync.
export default function ThemeApplier() {
  const branding = useBranding();
  const preview = usePreviewTheme();
  const themeId = preview || branding.theme;

  useEffect(() => {
    let element = document.getElementById(STYLE_ID);
    if (!element) {
      element = document.createElement("style");
      element.id = STYLE_ID;
      document.head.appendChild(element);
    }
    element.textContent = buildThemeCss(themeId);
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  useEffect(() => {
    document.title = branding.org_display_name;
  }, [branding.org_display_name]);

  return null;
}
