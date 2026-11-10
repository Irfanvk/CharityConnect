import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PhoneInput from "@/components/ui/phone-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_IMAGES, APP_PATHS } from "@/config/appPaths";
import { useOrgBrand } from "@/lib/branding";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

function suggestUsername(fullName, memberCode) {
  const first = String(fullName || "").trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9]/g, "") || "";
  const digits = String(memberCode || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!first) return "";
  return `${first}${digits}`.slice(0, 30);
}

function errorMessage(err, fallback) {
  const detail = err?.data?.detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (typeof detail === "string") return detail;
  if (err?.status === 429) return "Too many attempts. Please try again later.";
  if (err?.status >= 500) return "Server is unavailable. Please try again shortly.";
  return err?.message || fallback;
}

function Field({ label, htmlFor, hint, children, optional }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-slate-800 dark:text-slate-100">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default function Activate() {
  const orgBrand = useOrgBrand();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(null);
  const [form, setForm] = useState({
    member_code: "",
    full_name: "",
    phone: "",
    email: "",
    no_email: false,
    whatsapp_same: true,
    whatsapp_phone: "",
    username: "",
    password: "",
    confirm: "",
    last_paid_month: "",
  });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | ok | taken
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    let alive = true;
    charityClient.memberActivations.availability().then((r) => alive && setEnabled(Boolean(r?.enabled)));
    return () => { alive = false; };
  }, []);

  const set = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setError("");
  };

  // Suggest a username from the name and Member ID until the person edits it.
  useEffect(() => {
    if (usernameTouched) return;
    const suggestion = suggestUsername(form.full_name, form.member_code);
    setForm((prev) => (prev.username === suggestion ? prev : { ...prev, username: suggestion }));
  }, [form.full_name, form.member_code, usernameTouched]);

  const username = form.username.trim().toLowerCase();
  const usernameFormatError = username && !USERNAME_RE.test(username)
    ? "3-30 characters: letters, numbers, dot, dash or underscore"
    : "";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username || usernameFormatError) {
      setUsernameStatus("idle");
      return undefined;
    }
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await charityClient.auth.checkUsername(username);
        setUsernameStatus(r?.available ? "ok" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [username, usernameFormatError]);

  const whatsapp = form.whatsapp_same ? form.phone : form.whatsapp_phone;

  const validate = () => {
    if (!form.member_code.trim()) return "Please enter your Member ID.";
    if (form.full_name.trim().length < 2) return "Please enter your full name.";
    if (!form.phone || String(form.phone).replace(/\D/g, "").length < 7) return "Please enter your phone number.";
    if (!form.no_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      return "Please enter your email, or tick \"I don't use email\".";
    }
    if (form.no_email && (!whatsapp || String(whatsapp).replace(/\D/g, "").length < 7)) {
      return "Without email, please give your WhatsApp number.";
    }
    if (!username || usernameFormatError) return "Please choose a username (3-30 letters or numbers).";
    if (usernameStatus === "taken") return "This username is taken. Please choose another.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm) return "The two passwords don't match.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await charityClient.memberActivations.submit({
        member_code: form.member_code.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone,
        email: form.no_email ? null : form.email.trim(),
        no_email: form.no_email,
        whatsapp_phone: whatsapp || null,
        username,
        password: form.password,
        last_paid_month: form.last_paid_month || null,
      });
      setDone({ ...result, username });
      window.scrollTo?.(0, 0);
    } catch (err) {
      setError(errorMessage(err, "Could not send your request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children) => (
    <div className="relative min-h-screen overflow-hidden p-4 sm:p-6">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 12% 18%, rgba(250, 204, 21, 0.22), transparent 34%)",
            "radial-gradient(circle at 86% 20%, rgba(45, 212, 191, 0.22), transparent 30%)",
            "linear-gradient(145deg, #f8fafc 0%, #ecfeff 40%, #f0fdf4 100%)",
          ].join(","),
        }}
      />
      <div className="relative z-10 flex min-h-svh items-start sm:items-center justify-center py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <Card className="w-full max-w-md border-white/50 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm dark:border-slate-500/40 dark:bg-slate-900/90 dark:text-slate-100">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-white/80 p-2 shadow-md dark:bg-slate-800/80">
              <img src={orgBrand.logoUrl || APP_IMAGES.LOGOS.PRIMARY} alt="" className="h-full w-full object-contain" />
            </div>
            {children.header}
          </CardHeader>
          <CardContent className="space-y-4">{children.body}</CardContent>
        </Card>
      </div>
    </div>
  );

  if (done) {
    return shell({
      header: (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <CardTitle className="text-2xl font-bold">Request sent</CardTitle>
          <CardDescription>
            Thank you{form.full_name ? `, ${form.full_name.trim().split(/\s+/)[0]}` : ""}. We received your request for Member ID{" "}
            <strong>{done.member_code}</strong>.
          </CardDescription>
        </>
      ),
      body: (
        <>
          <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">1</span>An admin checks your details against our records.</li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">2</span><span>Sign in any time with <strong>{done.username}</strong> and your new password to see the status.</span></li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">3</span>Once approved, you get full access with your payment history.</li>
          </ol>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => navigate(APP_PATHS.LOGIN, { replace: true, state: { activationUsername: done.username } })}
          >
            Go to sign in
          </Button>
        </>
      ),
    });
  }

  if (enabled === false) {
    return shell({
      header: <CardTitle className="text-2xl font-bold">Account activation</CardTitle>,
      body: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Activating your account online is not available right now. Please ask an admin for an invite link.
          </p>
          <Button asChild variant="outline" className="w-full"><Link to={APP_PATHS.LOGIN}>Back to sign in</Link></Button>
        </>
      ),
    });
  }

  return shell({
    header: (
      <>
        <CardTitle className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">Activate your membership</CardTitle>
        <CardDescription>
          For existing members of {orgBrand.name}. Fill in your details and an admin will confirm them.
        </CardDescription>
      </>
    ),
    body: (
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field label="Member ID" htmlFor="member_code" hint="On your payment receipt, e.g. 0012 or MEM-0012. Ask an admin if you don't know it.">
          <Input
            id="member_code"
            value={form.member_code}
            onChange={(e) => set({ member_code: e.target.value })}
            placeholder="e.g. 0012"
            inputMode="text"
            autoComplete="off"
            className="font-mono tracking-wide"
          />
        </Field>

        <Field label="Full name" htmlFor="full_name" hint="As the admins know you.">
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
            autoComplete="name"
          />
        </Field>

        <PhoneInput
          id="phone"
          label="Phone number"
          value={form.phone}
          onChange={(value) => set({ phone: value })}
          required
          showExamples={false}
        />

        <div className="space-y-2">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={form.no_email ? "" : form.email}
              onChange={(e) => set({ email: e.target.value })}
              disabled={form.no_email}
              autoComplete="email"
              placeholder={form.no_email ? "Not used" : "you@example.com"}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <Checkbox checked={form.no_email} onCheckedChange={(v) => set({ no_email: v === true })} />
            I don't use email
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            WhatsApp number{!form.no_email && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <Checkbox checked={form.whatsapp_same} onCheckedChange={(v) => set({ whatsapp_same: v === true })} />
            Same as my phone number
          </label>
          {!form.whatsapp_same && (
            <PhoneInput
              id="whatsapp_phone"
              label="WhatsApp number"
              value={form.whatsapp_phone}
              onChange={(value) => set({ whatsapp_phone: value })}
              showExamples={false}
            />
          )}
        </div>

        <Field
          label="Last month you paid"
          htmlFor="last_paid_month"
          optional
          hint="If you remember. It helps the admins confirm it's you."
        >
          <Input
            id="last_paid_month"
            type="month"
            value={form.last_paid_month}
            onChange={(e) => set({ last_paid_month: e.target.value })}
            placeholder="2026-09"
          />
        </Field>

        <div className="border-t pt-4 space-y-4">
          <Field
            label="Username"
            htmlFor="username"
            hint={
              usernameFormatError
                || (usernameStatus === "checking" && "Checking...")
                || (usernameStatus === "taken" && "This username is taken. Please choose another.")
                || (usernameStatus === "ok" && "Available")
                || "You'll sign in with this."
            }
          >
            <Input
              id="username"
              value={form.username}
              onChange={(e) => { setUsernameTouched(true); set({ username: e.target.value.toLowerCase() }); }}
              autoComplete="username"
              autoCapitalize="none"
              className={usernameFormatError || usernameStatus === "taken" ? "border-rose-500" : ""}
            />
          </Field>

          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password" htmlFor="confirm">
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={(e) => set({ confirm: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <p className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          Your details are only used to confirm your membership and are seen by the admins.
        </p>

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting || enabled === null}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send activation request"}
        </Button>

        <div className="space-y-1 text-center text-sm text-slate-600 dark:text-slate-300">
          <p>Already activated? <Link to={APP_PATHS.LOGIN} className="font-medium text-emerald-700 hover:underline">Sign in</Link></p>
          <p>Have an invite code? <Link to="/register" className="font-medium text-emerald-700 hover:underline">Register with invite</Link></p>
        </div>
      </form>
    ),
  });
}
