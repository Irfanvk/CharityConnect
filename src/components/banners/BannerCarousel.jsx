import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { docHref } from "@/components/relief/ReliefParts";

/*
 * Occasion banners as a slideshow: one at a time, sliding every 6 seconds when there are
 * several, with dots. Anyone can close a banner; it stays hidden for them on this device
 * until it expires (or an admin changes it). place = "login" | "dashboard".
 */

const SLIDE_MS = 6000;
const dismissKey = (b) => `banner-closed:${b.id}:${b.updated_at || ""}`;

function isClosed(b) {
  try { return window.localStorage.getItem(dismissKey(b)) === "1"; } catch { return false; }
}

export function BannerCard({ banner, onClose, compact = false }) {
  const link = banner.button_link;
  const internal = link && link.startsWith("/");
  const Button = ({ children }) => (internal
    ? <Link to={link} className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">{children}</Link>
    : <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">{children}</a>);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className={`w-full bg-slate-100 dark:bg-slate-800 ${compact ? "aspect-[16/9]" : "aspect-[16/9] sm:aspect-[21/8]"}`}>
        <img src={docHref(banner.image_url)} alt={banner.title} className="h-full w-full object-cover object-center" loading="lazy" />
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close banner"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {(banner.message || (banner.button_label && link)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          {banner.message && <p className="min-w-0 flex-1 text-base font-medium text-slate-800 dark:text-slate-100">{banner.message}</p>}
          {banner.button_label && link && <Button>{banner.button_label}</Button>}
        </div>
      )}
    </div>
  );
}

export default function BannerCarousel({ place, className = "" }) {
  const { data } = useQuery({
    queryKey: ["banners", place],
    queryFn: () => (place === "login" ? charityClient.banners.login() : charityClient.banners.forMe()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const [closed, setClosed] = useState(0); // bumps when one is closed
  const banners = useMemo(() => (data?.items || []).filter((b) => !isClosed(b)), [data, closed]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { if (index >= banners.length) setIndex(0); }, [banners.length, index]);
  useEffect(() => {
    if (banners.length < 2 || paused) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [banners.length, paused]);

  if (!banners.length) return null;
  const current = banners[Math.min(index, banners.length - 1)];
  const close = () => {
    try { window.localStorage.setItem(dismissKey(current), "1"); } catch { /* still hidden until reload */ }
    setClosed((n) => n + 1);
  };

  return (
    <section
      className={`w-full ${className}`}
      aria-roledescription="carousel"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <BannerCard key={current.id} banner={current} onClose={close} />
      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Banner ${i + 1} of ${banners.length}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-emerald-600" : "w-2.5 bg-slate-300 dark:bg-slate-600"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
