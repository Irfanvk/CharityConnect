import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Calendar, MapPin, MessageCircle, BadgeCheck } from "lucide-react";
import { format } from "date-fns";

function AvatarCircle({ avatarUrl, name, size = "lg" }) {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  const sizeClasses = size === "lg" ? "w-16 h-16 text-2xl" : "w-8 h-8 text-sm";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold`}
    >
      {initial}
    </div>
  );
}

export default function UserProfilePopover({ user, children }) {
  if (!user) return children || null;

  const displayName =
    user.full_name?.trim() ||
    user.username?.trim() ||
    user.name?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  const memberCode = user.member_id || user.member_code || user.id || null;
  const addressLine = [user.address, user.city].filter(Boolean).join(", ");
  const phoneDigits = String(user.phone || "").replace(/\D/g, "");
  const hasDirectMessage = phoneDigits.length >= 8 || Boolean(user.email);
  const directMessageHref =
    phoneDigits.length >= 8
      ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hello ${displayName},`)}`
      : user.email
        ? `mailto:${user.email}`
        : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 hover:underline decoration-dotted underline-offset-2 cursor-pointer text-left"
        >
          {children || <span>{displayName}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" sideOffset={6}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <AvatarCircle avatarUrl={user.avatar_url} name={displayName} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">
                {displayName}
              </p>
              {user.role && (
                <Badge variant="secondary" className="mt-1 capitalize text-xs">
                  {user.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {memberCode && (
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300">ID:</span>
              <span className="truncate">{memberCode}</span>
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{user.phone}</span>
            </div>
          )}
          {addressLine && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{addressLine}</span>
            </div>
          )}
          {(user.join_date || user.created_at) && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Joined{" "}
                {format(
                  new Date(user.join_date || user.created_at),
                  "MMM yyyy"
                )}
              </span>
            </div>
          )}
        </div>
        {hasDirectMessage && directMessageHref && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-3">
            <a
              href={directMessageHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="w-4 h-4" />
              Direct Message Member
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { AvatarCircle };
