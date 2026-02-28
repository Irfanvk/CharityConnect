import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Book, Users, Shield, Settings, Heart, Receipt, 
  FileText, Bell, BarChart3, Code, Database, Key 
} from "lucide-react";
import { APP_BRAND } from "@/config/appPaths";

export default function Documentation() {
  const [activeTab, setActiveTab] = useState("overview");

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
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="entities">Data Model</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="api">Technical</TabsTrigger>
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
                <li><strong>Audit Trail:</strong> Complete logging of all administrative actions</li>
                <li><strong>Analytics & Reports:</strong> Comprehensive reporting and performance insights</li>
                <li><strong>Notifications:</strong> Real-time alerts for members and administrators</li>
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

              {/* Regular User */}
              <div className="border-l-4 border-emerald-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600">User</Badge>
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

            {/* Audit Logs */}
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
                  <p>const members = await charityClient.entities.Member.list();</p>
                  <p>await charityClient.entities.Challan.create(data);</p>
                  <p>await charityClient.entities.Campaign.update(id, data);</p>
                  <p>await charityClient.entities.Member.delete(id);</p>
                  
                  <p className="text-slate-500 mt-3">// Real-time Subscriptions</p>
                  <p>const unsubscribe = charityClient.entities.Notification.subscribe?.((event) ={'>'} {'{'}...</p>
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