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
