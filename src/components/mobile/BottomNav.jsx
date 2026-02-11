import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Receipt, Heart, User } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { name: "Dashboard", href: "Dashboard", icon: LayoutDashboard },
    { name: "Challans", href: "Challans", icon: Receipt },
    { name: "Campaigns", href: "Campaigns", icon: Heart },
    { name: "Profile", href: "Profile", icon: User },
  ];

  const isActive = (href) => {
    return location.pathname.includes(href);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 lg:hidden z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.href)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors select-none ${
                active 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}