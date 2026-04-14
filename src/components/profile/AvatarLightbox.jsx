import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * AvatarLightbox
 *
 * Shows an enlarged avatar image in a dark overlay.
 * Closes when: ESC key, clicking backdrop, or the X button.
 *
 * Props:
 *   open         – boolean
 *   onClose      – () => void
 *   avatarUrl    – string | null
 *   name         – string
 */
export default function AvatarLightbox({ open, onClose, avatarUrl, name }) {
    // Close on ESC
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open || !avatarUrl) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                onClick={onClose}
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Image — stop propagation so clicking the photo doesn't close */}
            <div
                className="animate-in zoom-in-90 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={avatarUrl}
                    alt={name || "Profile photo"}
                    className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover shadow-2xl border-4 border-white/20"
                    draggable={false}
                />
                {name && (
                    <p className="text-center text-white/80 text-sm mt-4 font-medium">{name}</p>
                )}
            </div>
        </div>
    );
}
