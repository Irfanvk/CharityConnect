import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { charityClient } from "@/api/charityClient";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Heart, 
  Bell, 
  Menu, 
  LogOut,
  ChevronDown,
  User,
  Settings,
  MessageSquare,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import NotificationManager from "@/components/NotificationManager";
import BottomNav from "@/components/mobile/BottomNav";
import BackButton from "@/components/mobile/BackButton";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUser();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Real-time subscription for notifications
    const unsubscribe = charityClient.entities.Notification.subscribe?.((event) => {
      loadNotifications();
    });

    return unsubscribe;
  }, [user]);

  const loadUser = async () => {
    try {
      const currentUser = await charityClient.auth.me();
      setUser(currentUser);
      loadNotifications();
    } catch (e) {
      console.log("Not logged in");
    }
  };

  const loadNotifications = async () => {
    try {
      const notifications = await charityClient.entities.Notification.list();
      const user = await charityClient.auth.me();
      const unread = notifications.filter(n => {
        if (n.target_type === 'all') return !n.read_by?.includes(user.email);
        if (n.target_type === 'member') return n.target_member_id === user.email && !n.read_by?.includes(user.email);
        if (n.target_type === 'admins' && user.role === 'admin') return !n.read_by?.includes(user.email);
        return false;
      });
      setUnreadCount(unread.length);
    } catch (e) {}
  };

  const isAdmin = user?.role === 'admin';

  const navigation = [
    { name: "Dashboard", href: "Dashboard", icon: LayoutDashboard },
    { name: "Members", href: "Members", icon: Users, adminOnly: true },
    { name: "Challans", href: "Challans", icon: Receipt },
    { name: "Campaigns", href: "Campaigns", icon: Heart },
    { name: "Reports", href: "Reports", icon: FileText, adminOnly: true },
    { name: "Audit Logs", href: "AuditLogs", icon: Settings, adminOnly: true },
    { name: "Requests", href: "Requests", icon: MessageSquare },
    { name: "Notifications", href: "Notifications", icon: Bell, badge: unreadCount },
    { name: "Documentation", href: "Documentation", icon: FileText },
  ];

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin);

  const mainPages = ["Dashboard", "Members", "Challans", "Campaigns", "Profile"];
  const isMainPage = mainPages.includes(currentPageName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <NotificationManager user={user} />
      <style>{`
        :root {
          --primary: 158 64% 42%;
          --primary-foreground: 0 0% 100%;
        }
        .dark {
          --primary: 158 64% 52%;
          --primary-foreground: 0 0% 100%;
          --background: 222 47% 11%;
          --foreground: 210 40% 98%;
          --card: 222 47% 11%;
          --card-foreground: 210 40% 98%;
          --popover: 222 47% 11%;
          --popover-foreground: 210 40% 98%;
          --secondary: 217 33% 17%;
          --secondary-foreground: 210 40% 98%;
          --muted: 217 33% 17%;
          --muted-foreground: 215 20% 65%;
          --accent: 217 33% 17%;
          --accent-foreground: 210 40% 98%;
          --destructive: 0 63% 31%;
          --destructive-foreground: 210 40% 98%;
          --border: 217 33% 17%;
          --input: 217 33% 17%;
          --ring: 224 71% 4%;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        button, a, [role="button"] {
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">CharityHub</h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Management System</p>
                    </div>
                  </div>
                </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 select-none
                    ${isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                  <span className="font-medium">{item.name}</span>
                  {item.badge > 0 && (
                    <Badge className="ml-auto bg-rose-500 hover:bg-rose-500 text-white text-xs px-2">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          {user && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{user.full_name || 'User'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Profile")} className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Settings")} className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      charityClient.auth.logout();
                      charityClient.auth.redirectToLogin();
                    }}
                    className="text-rose-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72 pb-16 lg:pb-0">
        {/* Top bar */}
        <header 
          className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            {!isMainPage ? (
              <BackButton />
            ) : (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 select-none"
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            )}
            
            <div className="flex-1 lg:flex-none">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white hidden lg:block">
                {currentPageName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Link to={createPageUrl("Notifications")}>
                <Button variant="ghost" size="icon" className="relative select-none">
                  <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPageName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}