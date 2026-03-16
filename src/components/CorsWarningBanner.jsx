import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { appParams } from "@/lib/app-params";
import { AUTH_TOKEN_KEY } from "@/config/constants";
import { AlertTriangle, X, ExternalLink, Copy, CheckCheck } from "lucide-react";

/**
 * Shows a visible banner when the backend is reachable but CORS is blocking
 * the auth request. Detection logic:
 *  - User has an auth token stored (was logged in)
 *  - Auth check has finished loading
 *  - User is NOT authenticated (auth/me failed)
 *  - The error type is 'auth_required' (not 'backend_unreachable')
 *
 * A genuine 401 / expired token clears localStorage immediately via
 * handleUnauthorized, so it won't trigger this banner.
 */
export default function CorsWarningBanner() {
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(null);

  const hasStoredToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem(AUTH_TOKEN_KEY));

  const backendUrl =
    (appParams.appBaseUrl || "").replace(/\/$/, "") || null;

  const isCorsBlocked =
    !isLoadingAuth &&
    !isAuthenticated &&
    hasStoredToken &&
    authError?.type === "auth_required" &&
    Boolean(backendUrl);

  if (!isCorsBlocked || dismissed) return null;

  const frontendOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://your-netlify-app.netlify.app";

  const corsOriginsValue = `${frontendOrigin},http://localhost:5173`;

  const allowedHostsValue = new URL(backendUrl).hostname + ",localhost,127.0.0.1";

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div
      role="alert"
      className="relative z-40 border-l-4 border-amber-500 bg-amber-50 px-4 py-4 shadow-md"
    >
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-2 min-w-0 w-full">
          <p className="font-semibold text-amber-900 text-sm">
            CORS is blocking requests to the backend
          </p>
          <p className="text-xs text-amber-800">
            Your session token is present, but the browser blocked the request to{" "}
            <code className="bg-amber-100 rounded px-1">{backendUrl}/auth/me</code> because{" "}
            <strong className="text-amber-900">{frontendOrigin}</strong> is not in the
            backend's allowed origins list.
          </p>

          <div className="border border-amber-300 rounded-lg bg-white/60 divide-y divide-amber-200 text-xs overflow-hidden">
            <div className="px-3 py-2 font-semibold text-amber-900 text-[11px] uppercase tracking-wide bg-amber-100/60">
              Fix: set these environment variables on Render (backend)
            </div>

            <EnvRow
              name="CORS_ORIGINS"
              value={corsOriginsValue}
              copied={copied === "cors"}
              onCopy={() => copyToClipboard(corsOriginsValue, "cors")}
            />
            <EnvRow
              name="ALLOWED_HOSTS"
              value={allowedHostsValue}
              copied={copied === "hosts"}
              onCopy={() => copyToClipboard(allowedHostsValue, "hosts")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <p className="text-[11px] text-amber-700">
              After saving the env vars, redeploy the backend on Render, then hard-refresh (Ctrl+Shift+R).
            </p>
            <a
              href="https://render.com/docs/configure-environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-amber-700 underline hover:text-amber-900"
            >
              Render env docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvRow({ name, value, copied, onCopy }) {
  return (
    <div className="px-3 py-2 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0 space-y-0.5">
        <span className="text-slate-500 font-mono text-[10px]">Name</span>
        <p className="font-mono font-semibold text-slate-800">{name}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="text-slate-500 font-mono text-[10px]">Value</span>
        <p className="font-mono text-slate-700 break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex-shrink-0 mt-5 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
      >
        {copied ? (
          <>
            <CheckCheck className="w-3 h-3 text-emerald-600" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" /> Copy value
          </>
        )}
      </button>
    </div>
  );
}
