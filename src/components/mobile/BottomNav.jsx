import React from "react";
import ReactDOM from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { PAGE_PATHS, ROUTE_KEYS } from "@/config/appPaths";
import { LayoutDashboard, Receipt, Heart, User } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", href: ROUTE_KEYS.DASHBOARD, path: PAGE_PATHS.DASHBOARD, icon: LayoutDashboard },
    { name: "Challans",  href: ROUTE_KEYS.CHALLANS,  path: PAGE_PATHS.CHALLANS,  icon: Receipt },
    { name: "Campaigns", href: ROUTE_KEYS.CAMPAIGNS, path: PAGE_PATHS.CAMPAIGNS, icon: Heart },
    { name: "Profile",   href: ROUTE_KEYS.PROFILE,   path: PAGE_PATHS.PROFILE,   icon: User },
  ];

  const isActive = (href) => location.pathname.includes(href);

  // Rendered as a portal directly into document.body so that no ancestor CSS
  // property (transform, filter, overflow, backdrop-filter) can act as a
  // containing block and break position:fixed behaviour on mobile browsers.
  return ReactDOM.createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors select-none ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>,
    document.body
  );
}