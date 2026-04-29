import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, Shield, Settings, Heart, Receipt,
  FileText, Bell, BarChart3, CheckCircle2, AlertCircle,
  Lightbulb, ArrowRight, Upload, UserPlus, LogIn,
  Search, Filter, ThumbsUp, ThumbsDown, RefreshCw,
  HelpCircle, Star, ChevronRight, Info, Wallet,
  ClipboardList, MessageSquare, Download, Eye
} from "lucide-react";
import { APP_BRAND } from "@/config/appPaths";
import { useAuth } from "@/lib/AuthContext";

// ─── Helper components ─────────────────────────────────────────────────────

function Step({ number, color = "emerald", title, children }) {
  const colors = {
    emerald: "bg-emerald-600",
    blue: "bg-blue-600",
    rose: "bg-rose-600",
    amber: "bg-amber-500",
    purple: "bg-purple-600",
    indigo: "bg-indigo-600",
  };
  return (
    <div className="flex items-start gap-4">
      <div className={`w-8 h-8 rounded-full ${colors[color]} text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5`}>
        {number}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800">{title}</p>
        {children && <p className="text-sm text-slate-600 mt-0.5">{children}</p>}
      </div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <span className="text-amber-800">{children}</span>
    </div>
  );
}

function Note({ children }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
      <span className="text-blue-800">{children}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, color, children }) {
  const colors = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    rose: "text-rose-600",
    amber: "text-amber-500",
    purple: "text-purple-600",
    indigo: "text-indigo-600",
  };
  return (
    <h3 className={`font-bold text-lg flex items-center gap-2 ${colors[color] || "text-slate-700"}`}>
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </h3>
  );
}

function StatusBadge({ status }) {
  const map = {
    generated: { label: "Generated", class: "bg-slate-100 text-slate-700" },
    pending: { label: "Pending", class: "bg-yellow-100 text-yellow-700" },
    proof_uploaded: { label: "Proof Uploaded", class: "bg-blue-100 text-blue-700" },
    approved: { label: "Approved", class: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", class: "bg-red-100 text-red-700" },
    active: { label: "Active", class: "bg-emerald-100 text-emerald-700" },
    inactive: { label: "Inactive", class: "bg-slate-100 text-slate-600" },
    suspended: { label: "Suspended", class: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, class: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${s.class}`}>
      {s.label}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Documentation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("start");
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isMember = !isAdmin;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-3xl font-bold">{APP_BRAND.NAME} User Guide</h1>
        </div>
        <p className="text-emerald-100 text-lg">
          Everything you need to know to get started and use the platform confidently.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge className="bg-white/20 text-white border-0">New Member? Start with "Getting Started"</Badge>
          {isAdmin && <Badge className="bg-white/20 text-white border-0">Admin? Check the Admin Guide tab</Badge>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid grid-cols-2 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <TabsTrigger value="start">Getting Started</TabsTrigger>
          <TabsTrigger value="member">Member Guide</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin Guide</TabsTrigger>}
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════
            TAB: Getting Started
        ════════════════════════════════════════ */}
        <TabsContent value="start" className="space-y-6 mt-6">

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Welcome to {APP_BRAND.NAME}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <p>
                <strong>{APP_BRAND.NAME}</strong> is the charity management platform for{" "}
                <strong>{APP_BRAND.TAGLINE}</strong>. It helps you track membership payments,
                contribute to donation campaigns, and stay in touch with the organisation — all in one place.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="border rounded-xl p-4 text-center space-y-2">
                  <Receipt className="w-7 h-7 text-emerald-600 mx-auto" />
                  <p className="font-semibold">Pay &amp; Track</p>
                  <p className="text-xs text-slate-500">Generate challans and upload your payment proof in seconds</p>
                </div>
                <div className="border rounded-xl p-4 text-center space-y-2">
                  <Heart className="w-7 h-7 text-rose-500 mx-auto" />
                  <p className="font-semibold">Donate</p>
                  <p className="text-xs text-slate-500">Browse and donate to active fundraising campaigns</p>
                </div>
                <div className="border rounded-xl p-4 text-center space-y-2">
                  <Bell className="w-7 h-7 text-indigo-500 mx-auto" />
                  <p className="font-semibold">Stay Informed</p>
                  <p className="text-xs text-slate-500">Receive real-time notifications from the organisation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Member Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                How to Join — Step by Step
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Step number={1} color="blue" title="Receive your invite code">
                  An admin will share a personal invite code with you via WhatsApp or email.
                </Step>
                <Step number={2} color="blue" title='Go to the app and click "Register"'>
                  On the login page, click <strong>Register</strong>. Enter your name, email, password, and the invite code you received.
                </Step>
                <Step number={3} color="blue" title="Verify your email (if prompted)">
                  Check your inbox for a verification email and click the link to confirm your account.
                </Step>
                <Step number={4} color="blue" title="Complete your profile">
                  After logging in for the first time you'll be prompted to fill in your phone number and address. This is required to be fully active.
                </Step>
                <Step number={5} color="blue" title="You're in! Start by paying your first challan">
                  Head to <strong>Challans</strong> in the left sidebar and generate your first monthly payment.
                </Step>
              </div>
              <Tip>Keep your invite code safe — each code can only be used once.</Tip>
            </CardContent>
          </Card>

          {/* User Roles at a Glance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Who Can Do What?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="border-l-4 border-emerald-500 pl-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600">Member</Badge>
                  <span className="text-slate-500 text-xs">That's you if you're a regular participant</span>
                </div>
                <ul className="text-slate-600 space-y-0.5 pt-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />View your own payment history</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Generate &amp; upload challans</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Donate to campaigns</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Submit requests to admin</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />Manage your notifications</li>
                </ul>
              </div>
              {isAdmin && (
                <div className="border-l-4 border-blue-500 pl-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600">Admin</Badge>
                    <span className="text-slate-500 text-xs">Organisation manager</span>
                  </div>
                  <ul className="text-slate-600 space-y-0.5 pt-1">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Everything a Member can do</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Add, edit &amp; manage members</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Approve or reject payment challans</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Create and manage campaigns</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Generate reports &amp; exports</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Send notifications to members</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />Review audit logs</li>
                  </ul>
                </div>
              )}
              <Note>You can always see your current role in the <strong>Profile</strong> page (click your name in the top-right corner).</Note>
            </CardContent>
          </Card>

          {/* Navigation guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-slate-500" />
                Finding Your Way Around
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p className="text-slate-600">Use the <strong>left sidebar</strong> (or bottom bar on mobile) to navigate between sections:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: BarChart3, color: "text-emerald-600", name: "Dashboard", desc: "Summary of your activity and latest updates" },
                  { icon: Receipt, color: "text-emerald-600", name: "Challans", desc: "Generate and manage your payments" },
                  { icon: Heart, color: "text-rose-500", name: "Campaigns", desc: "Active fundraising drives to donate to" },
                  { icon: Bell, color: "text-indigo-500", name: "Notifications", desc: "Alerts and messages from the organisation" },
                  { icon: MessageSquare, color: "text-amber-500", name: "Requests", desc: "Send a message or request to the admin" },
                  { icon: FileText, color: "text-slate-500", name: "Profile", desc: "Update your personal information" },
                ].map(({ icon: Icon, color, name, desc }) => (
                  <div key={name} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ════════════════════════════════════════
            TAB: Member Guide
        ════════════════════════════════════════ */}
        <TabsContent value="member" className="space-y-6 mt-6">

          {/* Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Your Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 space-y-3">
              <p>
                The <strong>Dashboard</strong> is your home screen. When you log in, you'll see:
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Total contributions</strong> — the total amount you've paid (approved challans)</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Pending challans</strong> — payments awaiting admin approval</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Active campaigns</strong> — fundraising drives you can join</span></li>
                <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Recent activity</strong> — latest challan and notification updates</span></li>
              </ul>
              <Tip>Check your Dashboard first every time you log in to see if any challans have been rejected or approved.</Tip>
            </CardContent>
          </Card>

          {/* Challans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                How to Pay Your Monthly Challan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-slate-600">
                A <strong>challan</strong> is your payment record. Every month you need to create one, transfer the money, upload proof, and wait for admin approval. Here's the full flow:
              </p>

              <div className="space-y-4">
                <Step number={1} color="emerald" title='Go to "Challans" in the sidebar' />
                <Step number={2} color="emerald" title='Click "Generate Challan"'>
                  A form will appear. Select <strong>Monthly</strong> as the type, pick the month you're paying for, and confirm the amount.
                </Step>
                <Step number={3} color="emerald" title="Transfer the money">
                  Pay via bank transfer or the method your organisation uses. Keep the receipt or screenshot handy.
                </Step>
                <Step number={4} color="emerald" title="Upload your proof">
                  Back on the Challans page, find your challan and click <strong>Upload Proof</strong>. Attach the payment screenshot or receipt (JPG, PNG, or PDF, max 3 MB).
                </Step>
                <Step number={5} color="emerald" title="Wait for admin approval">
                  Your challan status will change to <StatusBadge status="proof_uploaded" />.
                  The admin will review it and either approve or reject it.
                </Step>
                <Step number={6} color="emerald" title="Check the result">
                  Once reviewed you'll see <StatusBadge status="approved" /> or <StatusBadge status="rejected" />.
                  If rejected, read the reason, fix the issue, and re-upload your proof.
                </Step>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm">Challan Status Meanings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2"><StatusBadge status="generated" /> <span>Challan created, not yet paid</span></div>
                  <div className="flex items-center gap-2"><StatusBadge status="pending" /> <span>Awaiting your proof upload</span></div>
                  <div className="flex items-center gap-2"><StatusBadge status="proof_uploaded" /> <span>Proof submitted, admin reviewing</span></div>
                  <div className="flex items-center gap-2"><StatusBadge status="approved" /> <span>Payment confirmed ✓</span></div>
                  <div className="flex items-center gap-2"><StatusBadge status="rejected" /> <span>Rejected — re-upload needed</span></div>
                </div>
              </div>

              <Tip>You can pay multiple months at once. When generating a challan, select multiple months from the dropdown. Each month will get its own challan automatically.</Tip>
            </CardContent>
          </Card>

          {/* Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                How to Donate to a Campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Campaigns are special fundraising drives organised for a specific purpose. You can donate by creating a campaign challan.
              </p>
              <div className="space-y-4">
                <Step number={1} color="rose" title='Go to "Campaigns" in the sidebar'>
                  Browse the list of active campaigns and click one to see its goal, deadline, and progress.
                </Step>
                <Step number={2} color="rose" title='Click "Donate" on the campaign'>
                  A challan form will appear pre-filled with the campaign details. Enter the amount you wish to donate (must meet the minimum if set).
                </Step>
                <Step number={3} color="rose" title="Transfer the money and upload proof">
                  Same as a monthly challan — pay first, then upload proof.
                </Step>
                <Step number={4} color="rose" title="Track your donation">
                  Your donation challan will appear in the Challans page under the campaign type.
                </Step>
              </div>
              <Note>Campaign challans follow the same approval process as monthly challans. Once approved, the campaign progress bar will update automatically.</Note>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" />
                Updating Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>Click your name or avatar in the <strong>top-right corner</strong> of any page to open your profile.</p>
              <p>From there you can update:</p>
              <ul className="space-y-1 pl-2">
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />Full name, phone number, address</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />Profile picture</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />Password</li>
              </ul>
              <Tip>Keep your phone number up to date — admins use it to contact you if a payment needs clarification.</Tip>
            </CardContent>
          </Card>

          {/* Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Sending a Request to Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>If you have a question, need a correction, or want to report something, use the <strong>Requests</strong> page:</p>
              <div className="space-y-4">
                <Step number={1} color="amber" title='Go to "Requests" in the sidebar' />
                <Step number={2} color="amber" title='Click "New Request"'>
                  Choose the request type (e.g., Payment Issue, Profile Update, General Query), write a subject and describe your issue.
                </Step>
                <Step number={3} color="amber" title="Submit and track">
                  Your request will show as <strong>Pending</strong> until an admin responds. You'll receive a notification when it's resolved.
                </Step>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-500" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>The bell icon <strong>at the top</strong> shows how many unread notifications you have. Click it to see them.</p>
              <ul className="space-y-1 pl-2">
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />Challan approved or rejected</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />New campaign launched</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />Request resolved</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-slate-400" />General announcements from admin</li>
              </ul>
              <Tip>You can allow browser push notifications so you don't miss any updates even when the app isn't open. A prompt will appear the first time you visit the Notifications page.</Tip>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ════════════════════════════════════════
            TAB: Admin Guide (admin/superadmin only)
        ════════════════════════════════════════ */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6 mt-6">

            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="pt-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>This section is only visible to admins and superadmins. It covers the day-to-day tasks you'll be performing to keep the organisation running.</span>
                </div>
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Managing Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="space-y-3">
                  <SectionTitle icon={UserPlus} color="blue">Adding a New Member</SectionTitle>
                  <div className="space-y-3">
                    <Step number={1} color="blue" title='Go to "Members" → click "Add Member"'>
                      Fill in the member's full name, phone, email, address, city, and set their monthly amount.
                    </Step>
                    <Step number={2} color="blue" title="Assign a Member ID">
                      Enter a unique member ID (e.g., GCC-001). This is used for identification throughout the system.
                    </Step>
                    <Step number={3} color="blue" title="Save the record">
                      The member is now in the system. They won't have login access yet — send them an invite next.
                    </Step>
                    <Step number={4} color="blue" title="Send an invite">
                      Go to <strong>Settings → Invites</strong>. Generate an invite code and send it to the member. They use this to register.
                    </Step>
                  </div>
                  <Tip>You can bulk-import members from a CSV file via Settings → Import. Download the template first to see the required column format.</Tip>
                </div>

                <hr />

                <div className="space-y-3">
                  <SectionTitle icon={Eye} color="blue">Viewing &amp; Editing a Member</SectionTitle>
                  <p className="text-sm text-slate-600">On the Members page, click any member's name to open their profile. From there you can:</p>
                  <ul className="text-sm space-y-1 text-slate-600 pl-4">
                    <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-blue-400" />Edit contact details and monthly amount</li>
                    <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-blue-400" />Change status: <StatusBadge status="active" /> <StatusBadge status="inactive" /> <StatusBadge status="suspended" /></li>
                    <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-blue-400" />View their challan and payment history</li>
                  </ul>
                </div>

              </CardContent>
            </Card>

            {/* Challans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Reviewing &amp; Approving Challans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-slate-600">
                  When a member uploads proof of payment, the challan status changes to <StatusBadge status="proof_uploaded" />. You'll see it in your notification feed and on the Challans page.
                </p>

                <div className="space-y-3">
                  <SectionTitle icon={ThumbsUp} color="emerald">Approving a Challan</SectionTitle>
                  <div className="space-y-3">
                    <Step number={1} color="emerald" title='Go to "Challans" and filter by "Proof Uploaded"'>
                      Use the status filter dropdown to show only challans awaiting review.
                    </Step>
                    <Step number={2} color="emerald" title="Open the proof">
                      Click the challan row to expand it, then click <strong>View Proof</strong> to see the member's payment screenshot.
                    </Step>
                    <Step number={3} color="emerald" title='Click "Approve"'>
                      If the proof is valid, click the green Approve button. The challan status changes to <StatusBadge status="approved" /> and the member is notified.
                    </Step>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionTitle icon={ThumbsDown} color="rose">Rejecting a Challan</SectionTitle>
                  <div className="space-y-3">
                    <Step number={1} color="rose" title='Click "Reject" on the challan'>
                      A dialog will appear asking for a rejection reason.
                    </Step>
                    <Step number={2} color="rose" title="Enter a clear reason">
                      Explain why it's rejected (e.g., "Amount doesn't match", "Proof is unclear", "Wrong month"). This is shown to the member.
                    </Step>
                    <Step number={3} color="rose" title="Confirm rejection">
                      The member will be notified and can re-upload the correct proof.
                    </Step>
                  </div>
                  <Note>Rejected challans are kept for audit purposes. The member can upload new proof to the same challan.</Note>
                </div>

                <div className="space-y-3">
                  <SectionTitle icon={ClipboardList} color="blue">Bulk Challan Operations</SectionTitle>
                  <p className="text-sm text-slate-600">You can generate challans for all members at once (e.g., for a new month):</p>
                  <div className="space-y-3">
                    <Step number={1} color="blue" title='On the Challans page, click "Generate Challan" → select "Bulk"'>
                      Choose the month and which members to include. The system creates one challan per member.
                    </Step>
                    <Step number={2} color="blue" title="Approve or reject the whole group">
                      Bulk challans are grouped. You can approve or reject the entire group at once from the admin panel.
                    </Step>
                  </div>
                  <Tip>Bulk approve skips any challan that is already approved or rejected — it won't overwrite existing decisions.</Tip>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Creating &amp; Managing Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-4">
                    <Step number={1} color="rose" title='Go to "Campaigns" → click "Create Campaign"'>
                      Fill in the campaign title, description, target amount, start date, end date, and the minimum donation amount (optional).
                    </Step>
                    <Step number={2} color="rose" title="Publish the campaign">
                      Once saved, the campaign becomes visible to all members on their Campaigns page.
                    </Step>
                    <Step number={3} color="rose" title="Monitor progress">
                      The campaign card shows collected amount vs target in real time. Click the campaign to see individual donor details.
                    </Step>
                    <Step number={4} color="rose" title="Close or complete">
                      When the goal is reached or the end date passes, mark the campaign as <strong>Completed</strong>. You can also extend the deadline by editing the end date.
                    </Step>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  Reports &amp; Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>Go to <strong>Reports</strong> in the sidebar to access financial and activity reports:</p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><span><strong>Monthly Collection Report</strong> — total collected per month, broken down by member</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><span><strong>Campaign Performance</strong> — how much each campaign raised and from how many donors</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><span><strong>Member Activity</strong> — who is up to date vs who has outstanding payments</span></li>
                </ul>
                <div className="flex items-center gap-2 pt-1">
                  <Download className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Most reports can be <strong>exported to CSV</strong> using the Export button on each report page.</span>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" />
                  Sending Notifications to Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>You can broadcast messages to all members, specific members, or just admins:</p>
                <div className="space-y-4">
                  <Step number={1} color="indigo" title='Go to "Notifications" → click "Send Notification"'>
                    Fill in the title and message body.
                  </Step>
                  <Step number={2} color="indigo" title="Choose the audience">
                    <strong>All</strong> — everyone; <strong>Members only</strong> — regular members; <strong>Admins only</strong> — admin team.
                  </Step>
                  <Step number={3} color="indigo" title="Choose the type">
                    Info, Success, Warning, or Alert — this controls the colour and icon shown to recipients.
                  </Step>
                </div>
              </CardContent>
            </Card>

            {/* Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  Handling Member Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>Go to <strong>Admin → Requests</strong> to see all open requests from members.</p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-amber-400" />Filter by status (Pending / Resolved) or priority</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-amber-400" />Click a request to open it and write a response</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-amber-400" />Mark as Resolved once addressed — the member will be notified</li>
                </ul>
                <Tip>High-priority requests show a red badge. Review those first.</Tip>
              </CardContent>
            </Card>

            {/* Audit Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  Audit Logs — Who Did What
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>Every admin action is recorded automatically. Go to <strong>Audit Logs</strong> to see the full history:</p>
                <ul className="space-y-1 pl-2">
                  <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-purple-400" />Who performed the action and when</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-purple-400" />What was changed (member updated, challan approved, etc.)</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-purple-400" />Filter by action type or date range</li>
                </ul>
                <Note>Audit logs cannot be deleted. They are permanent records for accountability.</Note>
              </CardContent>
            </Card>

          </TabsContent>
        )}

        {/* ════════════════════════════════════════
            TAB: FAQ
        ════════════════════════════════════════ */}
        <TabsContent value="faq" className="space-y-4 mt-6">

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">

              {[
                {
                  q: "I haven't received my invite code — what do I do?",
                  a: "Contact your admin directly (WhatsApp or phone) and ask them to re-send or regenerate the invite code from Settings → Invites.",
                  role: "member",
                },
                {
                  q: "My challan was rejected — what should I do?",
                  a: "Open the rejected challan, read the rejection reason, then re-upload the correct payment proof. Make sure the screenshot clearly shows the transaction date, amount, and recipient. You do not need to create a new challan.",
                  role: "member",
                },
                {
                  q: "I made a payment but forgot to upload proof — is it lost?",
                  a: "No. Find the challan in the Challans page (it will still be in Generated or Pending status). Click the Upload Proof button and attach your receipt.",
                  role: "member",
                },
                {
                  q: "Can I pay multiple months at once?",
                  a: "Yes. When generating a challan, select multiple months from the month picker. Each month will get a separate challan, but you can upload a single shared proof covering all of them.",
                  role: "member",
                },
                {
                  q: "Why can't I change the amount on my challan?",
                  a: "The amount is set by admin based on your membership fee. Only admins can modify challan amounts. If you believe the amount is wrong, submit a Request to the admin.",
                  role: "member",
                },
                {
                  q: "How do I know if my donation to a campaign was accepted?",
                  a: "You'll receive a notification when the admin approves your campaign challan. You can also check the campaign page — your name will appear in the donor list.",
                  role: "member",
                },
                {
                  q: "How do I reset my password?",
                  a: 'Click "Forgot Password" on the login page. Enter your email and you\'ll receive a reset link. If you don\'t receive it, check your spam folder or contact admin.',
                  role: "member",
                },
                ...(isAdmin ? [
                  {
                    q: "A member registered but their profile isn't linked to a member record — why?",
                    a: "This happens when the email used during registration doesn't match the email on their member record, or the member record wasn't created before they registered. Go to Members, find or create their record, and ensure the email matches exactly.",
                    role: "admin",
                  },
                  {
                    q: "Can I undo an approval?",
                    a: "Yes — find the challan and use the Revert action to change it back to Pending status. Only do this if you approved by mistake.",
                    role: "admin",
                  },
                  {
                    q: "How do I add multiple members at once?",
                    a: "Use the Import feature. Go to Settings → Import, download the CSV template, fill it in with member data, and upload it. The system will create all records in one go.",
                    role: "admin",
                  },
                  {
                    q: "A member says they never got a notification — what should I check?",
                    a: "First check if the notification was sent to the right audience (All vs Members). Then ask the member to check their browser push notification permissions and whether they've allowed notifications in the app.",
                    role: "admin",
                  },
                ] : []),
              ].map(({ q, a, role }) => (
                <div key={q} className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="font-semibold text-slate-800">{q}</p>
                  </div>
                  <p className="text-slate-600 pl-6">{a}</p>
                </div>
              ))}

            </CardContent>
          </Card>

          {/* Contact / Support */}
          <Card className="border-2 border-emerald-200 bg-emerald-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <MessageSquare className="w-5 h-5" />
                Still Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 space-y-2">
              <p>If you can't find an answer here:</p>
              <ul className="space-y-1 pl-2">
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-emerald-500" />Submit a <strong>Request</strong> via the Requests page — admins will respond there</li>
                <li className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-emerald-500" />Contact your admin directly by phone or WhatsApp</li>
              </ul>
              <p className="text-slate-500 pt-2 text-xs">{APP_BRAND.NAME} v2.0 · Last updated April 2026</p>
            </CardContent>
          </Card>

        </TabsContent>

      </Tabs>
    </div>
  );
}

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Book className="w-8 h-8" />
          <h1 className="text-3xl font-bold">{`${APP_BRAND.NAME} Documentation`}</h1>
        </div>
        <p className="text-indigo-100 text-lg">
          Complete guide to the Charity Membership & Donation Management System
        </p>
        <p className="text-indigo-200 text-sm mt-2">Version 2.0 • Last Updated: February 2026</p>
      </div>

      {/* Documentation Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid grid-cols-2 md:grid-cols-4 ${isMember ? "" : "lg:grid-cols-6"}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          {!isMember && <TabsTrigger value="entities">Data Model</TabsTrigger>}
          {!isMember && <TabsTrigger value="api">Technical</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="w-5 h-5 text-indigo-600" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <h3>{`About ${APP_BRAND.NAME}`}</h3>
              <p>
                {APP_BRAND.NAME} is a comprehensive charity membership and donation management system designed to streamline 
                operations for charitable organizations. It provides tools for member management, payment tracking, 
                campaign management, and detailed analytics.
              </p>

              <h3>Key Capabilities</h3>
              <ul>
                <li><strong>Member Management:</strong> Track active members, manage profiles, and monitor status</li>
                <li><strong>Payment Processing:</strong> Generate challans, upload proof, approve/reject payments</li>
                <li><strong>Campaign Management:</strong> Create fundraising campaigns with goals and tracking</li>
                <li><strong>Recurring Donations:</strong> Set up automatic monthly/yearly donation schedules</li>
                {!isMember && <li><strong>Audit Trail:</strong> Complete logging of all administrative actions</li>}
                {!isMember && <li><strong>Analytics & Reports:</strong> Comprehensive reporting and performance insights</li>}
                <li><strong>Notifications:</strong> Real-time alerts for members and administrators</li>
              </ul>

              <h3>Registration Flow</h3>
              <ul>
                <li><strong>Step 1:</strong> Admin shares invite code with a member</li>
                <li><strong>Step 2:</strong> Member completes registration using invite code</li>
                <li><strong>Step 3:</strong> Member completes first-time setup and starts contributing</li>
              </ul>

              <h3>System Architecture</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
                <div className="p-4 border rounded-lg">
                  <Database className="w-6 h-6 text-blue-600 mb-2" />
                  <h4 className="font-semibold mb-1">Database Layer</h4>
                  <p className="text-sm text-slate-600">8 core entities with relationships</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Code className="w-6 h-6 text-emerald-600 mb-2" />
                  <h4 className="font-semibold mb-1">Business Logic</h4>
                  <p className="text-sm text-slate-600">React components with CharityConnect SDK</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600 mb-2" />
                  <h4 className="font-semibold mb-1">Security</h4>
                  <p className="text-sm text-slate-600">Role-based access control</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Roles Tab */}
        <TabsContent value="roles" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User Roles & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Superadmin */}
              {!isMember && (
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-600">Superadmin</Badge>
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-sm text-slate-700 mb-3">
                    System developers with full access to advanced analytics and all system functions.
                  </p>
                  <h4 className="font-semibold text-sm mb-2">Permissions:</h4>
                  <ul className="text-sm space-y-1 text-slate-600">
                    <li>✓ All admin permissions</li>
                    <li>✓ Advanced analytics dashboard with KPIs</li>
                    <li>✓ System-wide performance metrics</li>
                    <li>✓ Full audit log access</li>
                    <li>✓ Engagement metrics and trends</li>
                    <li>✓ Database and entity management</li>
                  </ul>
                </div>
              )}

              {/* Admin */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-600">Admin</Badge>
                  <Settings className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  Organization administrators managing day-to-day operations.
                </p>
                <h4 className="font-semibold text-sm mb-2">Permissions:</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>✓ Create, edit, delete members</li>
                  <li>✓ Approve/reject payment challans</li>
                  <li>✓ Create and manage campaigns</li>
                  <li>✓ Generate reports</li>
                  <li>✓ Invite new users</li>
                  <li>✓ Send system notifications</li>
                  <li>✓ View analytics and audit logs</li>
                  <li>✗ Cannot access superadmin dashboard</li>
                </ul>
              </div>

              {/* Member */}
              <div className="border-l-4 border-emerald-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600">Member</Badge>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  Regular members who can manage their own donations and view campaigns.
                </p>
                <h4 className="font-semibold text-sm mb-2">Permissions:</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>✓ View personal profile and contribution history</li>
                  <li>✓ Upload payment proof for challans</li>
                  <li>✓ View and donate to campaigns</li>
                  <li>✓ Set up recurring donations</li>
                  <li>✓ Submit requests to admins</li>
                  <li>✓ Manage personal notifications</li>
                  <li>✗ Cannot access admin features</li>
                  <li>✗ Cannot view other members' data</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Members Module */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                  Members Module
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-slate-600">Comprehensive member management system.</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Member registration with unique IDs</li>
                    <li>• Profile management (name, phone, email, address)</li>
                    <li>• Status tracking (active, inactive, suspended)</li>
                    <li>• Monthly membership amounts</li>
                    <li>• Search and filter capabilities</li>
                    <li>• Bulk operations support</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Challans Module */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Challans Module
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-slate-600">Payment challan generation and tracking.</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Generate monthly membership challans</li>
                    <li>• Create campaign donation challans</li>
                    <li>• Upload payment proof images</li>
                    <li>• Admin approval/rejection workflow</li>
                    <li>• Status tracking (5 states)</li>
                    <li>• Search and filter by status/date</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Module */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-rose-600" />
                  Campaigns Module
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-slate-600">Fundraising campaign management.</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Create campaigns with targets and dates</li>
                    <li>• Track progress and participants</li>
                    <li>• Set minimum donation amounts</li>
                    <li>• Campaign analytics and reporting</li>
                    <li>• Performance comparison charts</li>
                    <li>• Recurring donation setup</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Reports Module */}
            {!isMember && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  Reports & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-slate-600">Comprehensive reporting and insights.</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Monthly and yearly financial reports</li>
                    <li>• Campaign performance reports</li>
                    <li>• Donor demographics analysis</li>
                    <li>• CSV export functionality</li>
                    <li>• Real-time KPI dashboards</li>
                    <li>• Trend analysis charts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Audit Logs */}
            {!isMember && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-slate-600">Complete activity tracking and accountability.</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Tracked Actions:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Member CRUD operations</li>
                    <li>• Campaign management actions</li>
                    <li>• Challan approvals/rejections</li>
                    <li>• Report generation events</li>
                    <li>• Status change history</li>
                    <li>• Notification deletions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-slate-600">Real-time communication system.</p>
                <div className="space-y-2">
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Targeted notifications (all, member, admin)</li>
                    <li>• Multiple types (info, success, warning, etc.)</li>
                    <li>• Read/unread tracking</li>
                    <li>• Browser push notifications</li>
                    <li>• Real-time updates via subscriptions</li>
                    <li>• User-managed deletion</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Entities Tab */}
        {!isMember && (
        <TabsContent value="entities" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Data Model & Entities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>User</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">Built-in authentication entity</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• email (string, unique)</li>
                    <li>• full_name (string)</li>
                    <li>• role (admin/user)</li>
                    <li>• is_superadmin (boolean)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Member</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">Organization member profiles</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• member_id (string, unique)</li>
                    <li>• full_name, phone, email</li>
                    <li>• address, city</li>
                    <li>• status (active/inactive/suspended)</li>
                    <li>• monthly_amount (number)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Challan</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">Payment tracking records</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• challan_number (string, unique)</li>
                    <li>• member_id, member_name</li>
                    <li>• type (monthly/donation)</li>
                    <li>• amount (number)</li>
                    <li>• status (5 states)</li>
                    <li>• proof_url (string)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Campaign</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">Fundraising campaigns</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• title, description</li>
                    <li>• target_amount, collected_amount</li>
                    <li>• start_date, end_date</li>
                    <li>• status (active/completed/cancelled)</li>
                    <li>• participants_count</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>RecurringDonation</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">Automatic donation schedules</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• campaign_id, member_id</li>
                    <li>• amount (number)</li>
                    <li>• frequency (monthly/yearly)</li>
                    <li>• next_donation_date</li>
                    <li>• status (active/paused/cancelled)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>AuditLog</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">Activity tracking</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• action_type (enum, 11 types)</li>
                    <li>• performed_by, performed_by_name</li>
                    <li>• target_type, target_id, target_name</li>
                    <li>• details (object)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Notification</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">System notifications</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• title, message</li>
                    <li>• type (info/success/warning/etc)</li>
                    <li>• target_type (all/member/admins)</li>
                    <li>• read_by (array of emails)</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Request</Badge>
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">User requests to admins</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>• request_type (5 types)</li>
                    <li>• subject, message</li>
                    <li>• status (pending/resolved/etc)</li>
                    <li>• priority (low/medium/high)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Common Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Member Onboarding */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Member Onboarding
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-blue-600 mt-1">1</Badge>
                    <div>
                      <p className="font-medium">Admin creates member record</p>
                      <p className="text-slate-600">Navigate to Members → Add Member, fill details, assign member ID</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-blue-600 mt-1">2</Badge>
                    <div>
                      <p className="font-medium">Admin invites user</p>
                      <p className="text-slate-600">Settings → Generate Invite → Share invite code with member</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-blue-600 mt-1">3</Badge>
                    <div>
                      <p className="font-medium">Member registers</p>
                      <p className="text-slate-600">Member uses invite code to create account and complete onboarding</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Processing */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Payment Processing
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-emerald-600 mt-1">1</Badge>
                    <div>
                      <p className="font-medium">Generate challan</p>
                      <p className="text-slate-600">Admin/Member creates challan (monthly or campaign donation)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-emerald-600 mt-1">2</Badge>
                    <div>
                      <p className="font-medium">Upload proof</p>
                      <p className="text-slate-600">Member uploads payment proof image (screenshot/receipt)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-emerald-600 mt-1">3</Badge>
                    <div>
                      <p className="font-medium">Admin review</p>
                      <p className="text-slate-600">Admin reviews proof and approves or rejects with reason</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-emerald-600 mt-1">4</Badge>
                    <div>
                      <p className="font-medium">Campaign update</p>
                      <p className="text-slate-600">If approved, campaign collected_amount auto-updates</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign Creation */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600" />
                  Campaign Management
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-rose-600 mt-1">1</Badge>
                    <div>
                      <p className="font-medium">Create campaign</p>
                      <p className="text-slate-600">Admin sets title, target, dates, description, minimum amount</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-rose-600 mt-1">2</Badge>
                    <div>
                      <p className="font-medium">Members donate</p>
                      <p className="text-slate-600">Users generate donation challans or set up recurring donations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-rose-600 mt-1">3</Badge>
                    <div>
                      <p className="font-medium">Track progress</p>
                      <p className="text-slate-600">Monitor real-time progress, participants, and analytics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-rose-600 mt-1">4</Badge>
                    <div>
                      <p className="font-medium">Complete or extend</p>
                      <p className="text-slate-600">Mark as completed when target reached or extend deadline</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Tab */}
        {!isMember && (
        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                Technical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Technology Stack</h3>
                <ul className="space-y-1 text-slate-600">
                  <li>• <strong>Frontend:</strong> React 18 with TypeScript</li>
                  <li>• <strong>Styling:</strong> Tailwind CSS + shadcn/ui components</li>
                  <li>• <strong>Backend:</strong> CharityConnect Platform (BaaS)</li>
                  <li>• <strong>State Management:</strong> TanStack React Query</li>
                  <li>• <strong>Charts:</strong> Recharts</li>
                  <li>• <strong>Date Handling:</strong> date-fns</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">CharityConnect SDK Usage</h3>
                <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs space-y-2">
                  <p className="text-slate-500">// Authentication</p>
                  <p>const user = await charityClient.auth.me();</p>
                  <p>await charityClient.auth.updateMe?.(data);</p>
                  <p>charityClient.auth.logout();</p>
                  
                  <p className="text-slate-500 mt-3">// Entity Operations</p>
                  <p>const members = await charityClient.members.list();</p>
                  <p>await charityClient.challans.create(data);</p>
                  <p>await charityClient.campaigns.update(id, data);</p>
                  <p>await charityClient.members.delete(id);</p>
                  
                  <p className="text-slate-500 mt-3">// Real-time Subscriptions</p>
                  <p>const unsubscribe = charityClient.notifications.subscribe?.((event) ={'>'} {'{'}...</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Security Features</h3>
                <ul className="space-y-1 text-slate-600">
                  <li>• Role-based access control (RBAC)</li>
                  <li>• Built-in User entity with automatic security rules</li>
                  <li>• Email-based authentication</li>
                  <li>• Audit trail for all admin actions</li>
                  <li>• Superadmin flag for elevated access</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Performance Optimizations</h3>
                <ul className="space-y-1 text-slate-600">
                  <li>• React Query for efficient data caching</li>
                  <li>• Real-time subscriptions for instant updates</li>
                  <li>• Lazy loading of dashboard components</li>
                  <li>• Optimistic UI updates</li>
                  <li>• Pagination for large datasets</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Deployment</h3>
                <ul className="space-y-1 text-slate-600">
                  <li>• Hosted on CharityConnect platform</li>
                  <li>• Automatic SSL/TLS encryption</li>
                  <li>• CDN for static assets</li>
                  <li>• Automatic backups</li>
                  <li>• Zero-downtime deployments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Quick Reference Card */}
      <Card className="border-2 border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Support</h4>
              <p className="text-slate-600">For technical issues or feature requests, contact your system administrator.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Version</h4>
                <p className="text-slate-600">{`${APP_BRAND.NAME} v2.0 with advanced analytics and recurring donations.`}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}