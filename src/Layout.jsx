// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { APP_BRAND, APP_IMAGES, PAGE_PATHS, ROUTE_KEYS } from "@/config/appPaths";
import { pagesConfig } from "@/pages.config";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Heart,
  Users2,
  Bell,
  Menu,
  LogOut,
  ChevronDown,
  User,
  Settings,
  Shield,
  MessageSquare,
  Inbox,
  FileText,
  Upload,
  Wallet,
  MapPinned
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
import CorsWarningBanner from "@/components/CorsWarningBanner";
import PWAInstallButton from "@/components/PWAInstallButton";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import BottomNav from "@/components/mobile/BottomNav";
import BackButton from "@/components/mobile/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/context/NotificationContext";
import { dismissWayfinding, recordWayfindingVisit, shouldShowWayfinding, WAYFINDING_STATE_EVENT } from "@/lib/wayfinding";

export default function Layout({ children, currentPageName }) {
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [showWayfinding, setShowWayfinding] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const sidebarNavRef = useRef(null);
  const currentUser = authUser;
  const currentUserId = currentUser?.id ?? null;
  const currentUserRole = currentUser?.role ?? null;
  const wayfindingUserKey = currentUser?.id || currentUser?.email || null;
  const { unreadCount } = useNotifications();

  const loadPendingRequestsCount = useCallback(async () => {
    try {
      if (!currentUserId) {
        setPendingRequestsCount(0);
        return;
      }

      const isAdminUser = currentUserRole === 'admin' || currentUserRole === 'superadmin';
      if (isAdminUser) {
        const page = await charityClient.requests.adminList({ status: 'pending', skip: 0, limit: 1 });
        setPendingRequestsCount(Number(page?.total || 0));
        return;
      }

      // Members: use limit:1 + total field to avoid fetching full records just for a count
      const page = await charityClient.requests.list({ status: 'pending', skip: 0, limit: 1 });
      setPendingRequestsCount(Number(page?.total ?? (Array.isArray(page) ? page.length : 0)));
    } catch {
      setPendingRequestsCount(0);
    }
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    if (!currentUserId) return;
    loadPendingRequestsCount();

    const requestPolling = window.setInterval(() => {
      loadPendingRequestsCount();
    }, 60000);

    return () => {
      window.clearInterval(requestPolling);
    };
  }, [currentUserId, loadPendingRequestsCount]);

  useEffect(() => {
    // With the app-shell pattern the window never scrolls, so no body scroll lock needed.
    // Just reset the nav scroll to top when the sidebar opens.
    if (sidebarOpen && sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = 0;
    }
  }, [sidebarOpen]);

  useEffect(() => {
    setShowWayfinding(recordWayfindingVisit(wayfindingUserKey));
  }, [wayfindingUserKey]);

  useEffect(() => {
    if (!wayfindingUserKey || typeof window === 'undefined') return undefined;

    const handleWayfindingStateChange = (event) => {
      if (event?.detail?.userKey && String(event.detail.userKey) !== String(wayfindingUserKey)) {
        return;
      }
      setShowWayfinding(shouldShowWayfinding(wayfindingUserKey));
    };

    window.addEventListener(WAYFINDING_STATE_EVENT, handleWayfindingStateChange);
    return () => window.removeEventListener(WAYFINDING_STATE_EVENT, handleWayfindingStateChange);
  }, [wayfindingUserKey]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperadmin = currentUser?.role === 'superadmin';
  const displayName =
    currentUser?.full_name?.trim() ||
    currentUser?.username?.trim() ||
    currentUser?.email?.split('@')[0] ||
    'User';
  const avatarInitial = displayName?.charAt(0)?.toUpperCase() || 'U';
  const hasRequestsPage = Boolean(pagesConfig?.Pages?.[ROUTE_KEYS.REQUESTS]);

  const navigation = [
    { name: "Dashboard", href: ROUTE_KEYS.DASHBOARD, path: PAGE_PATHS.DASHBOARD, icon: LayoutDashboard, description: "Your home view and daily summary" },
    { name: "Community", href: ROUTE_KEYS.COMMUNITY, path: PAGE_PATHS.COMMUNITY, icon: Users2, description: "Members, collections, and spending" },
    { name: "Members", href: ROUTE_KEYS.MEMBERS, path: PAGE_PATHS.MEMBERS, icon: Users, adminOnly: true, description: "Who is part of the organisation" },
    { name: "Challans", href: ROUTE_KEYS.CHALLANS, path: PAGE_PATHS.CHALLANS, icon: Receipt, description: "Payments, receipts, and proof uploads" },
    { name: "Campaigns", href: ROUTE_KEYS.CAMPAIGNS, path: PAGE_PATHS.CAMPAIGNS, icon: Heart, description: "Causes you can support and track" },
    { name: "Reports", href: ROUTE_KEYS.REPORTS, path: PAGE_PATHS.REPORTS, icon: FileText, adminOnly: true, description: "Financial summaries and exports" },
    { name: "Audit Logs", href: ROUTE_KEYS.AUDIT_LOGS, path: PAGE_PATHS.AUDIT_LOGS, icon: Settings, adminOnly: true, description: "Who changed what and when" },
    { name: "Fund Utilization", href: ROUTE_KEYS.FUND_UTILIZATION, path: PAGE_PATHS.FUND_UTILIZATION, icon: Wallet, adminOnly: true, description: "How funds are being used" },
    ...(hasRequestsPage
      ? [
        isAdmin
          ? {
            name: "Requests",
            href: ROUTE_KEYS.ADMIN_REQUESTS,
            path: PAGE_PATHS.ADMIN_REQUESTS,
            icon: Inbox,
            badge: pendingRequestsCount,
            adminOnly: true,
            description: "Pending member requests to review",
          }
          : {
            name: "My Requests",
            href: ROUTE_KEYS.REQUESTS,
            path: '/requests',
            icon: MessageSquare,
            badge: pendingRequestsCount,
            description: "Track changes waiting for approval",
          },
      ]
      : []),
    { name: "Notifications", href: ROUTE_KEYS.NOTIFICATIONS, path: PAGE_PATHS.NOTIFICATIONS, icon: Bell, badge: unreadCount, description: "What is new in your account" },
    { name: "User Guide", href: ROUTE_KEYS.DOCUMENTATION, path: PAGE_PATHS.DOCUMENTATION, icon: FileText, description: "How to use each area of the app" },
    { name: "Import Data", href: ROUTE_KEYS.IMPORT, path: PAGE_PATHS.IMPORT, icon: Upload, superadminOnly: true, description: "Bring records into the system" },
    { name: "Superadmin Panel", href: ROUTE_KEYS.SUPERADMIN_PANEL, path: PAGE_PATHS.SUPERADMIN_PANEL, icon: Shield, superadminOnly: true, description: "System-wide control and oversight" },
  ];

  const filteredNav = navigation.filter(item => {
    if (item.superadminOnly) return isSuperadmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const mainPages = [ROUTE_KEYS.DASHBOARD, ROUTE_KEYS.COMMUNITY, ROUTE_KEYS.MEMBERS, ROUTE_KEYS.CHALLANS, ROUTE_KEYS.CAMPAIGNS, ROUTE_KEYS.PROFILE];
  const isMainPage = mainPages.includes(currentPageName);

  const handleSidebarTouchStart = useCallback((event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);

  const handleSidebarTouchEnd = useCallback((event) => {
    if (!sidebarOpen) return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Close only on a deliberate horizontal left swipe.
    if (deltaX < -56 && Math.abs(deltaY) < 72) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <NotificationManager user={currentUser} />
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
        fixed inset-y-0 top-0 z-50 h-[100dvh] w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800
        transition-[left] duration-200 ease-out lg:duration-300
        ${sidebarOpen ? 'left-0' : 'left-[-18rem]'}
        lg:left-0
      `}
        style={{ willChange: 'left' }}
        onTouchStart={handleSidebarTouchStart}
        onTouchEnd={handleSidebarTouchEnd}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {logoLoadError ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Heart className="w-5 h-5 text-white" />
                </div>
              ) : (
                <img
                  src={APP_IMAGES.LOGOS.PRIMARY}
                  alt={`${APP_BRAND.NAME} logo`}
                  className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-emerald-500/30"
                  onError={() => setLogoLoadError(true)}
                />
              )}
              <div>
                <h1 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">{APP_BRAND.NAME}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{APP_BRAND.TAGLINE}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav ref={sidebarNavRef} className="flex-1 min-h-0 p-4 space-y-1.5 overflow-y-auto">
            {showWayfinding ? (
              <div className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <MapPinned className="h-4 w-4" />
                    Home Map
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissWayfinding(wayfindingUserKey)}
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80 hover:text-emerald-900 dark:text-emerald-200/80 dark:hover:text-emerald-50"
                  >
                    Hide
                  </button>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-100/80">
                  Dashboard is your front room. Profile and logout are in the account menu below.
                </p>
              </div>
            ) : null}
            {filteredNav.map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 select-none
                    ${isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    {showWayfinding && item.description ? (
                      <span className={`block truncate text-xs ${isActive ? 'text-emerald-600/80 dark:text-emerald-300/80' : 'text-slate-400 dark:text-slate-500'}`}>
                        {item.description}
                      </span>
                    ) : null}
                  </div>
                  {item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto bg-rose-500 hover:bg-rose-500 text-white text-xs px-2">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          {currentUser && (
            <div className="sticky bottom-0 z-10 mt-auto border-t border-slate-100 bg-white/90 p-4 pb-20 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90 lg:pb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt={displayName} className="w-10 h-10 object-cover" />
                      ) : (
                        avatarInitial
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{displayName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{currentUser.role}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={PAGE_PATHS.PROFILE} onClick={() => setSidebarOpen(false)} className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to={PAGE_PATHS.SETTINGS} onClick={() => setSidebarOpen(false)} className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
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
      <div className="lg:pl-72 pb-16 lg:pb-0 h-[100dvh] overflow-y-auto">
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
              <PWAInstallButton />
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="hidden sm:inline-flex"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
              <Link to={PAGE_PATHS.NOTIFICATIONS}>
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

        {/* CORS diagnostic banner — auto-detects misconfigured backend origin */}
        <CorsWarningBanner />

        {/* Page content */}
        <main className="p-4 lg:p-8 pb-20 lg:pb-8" style={{ paddingBottom: 'max(5rem, calc(5rem + env(safe-area-inset-bottom)))' }}>
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
      <PWAUpdatePrompt />
    </div>
  );
}