import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { useAuth } from "@/lib/AuthContext";
import { holdAutoInstall, useInstallState } from "@/lib/installPrompt";
import { isLocationComplete } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LocationFields from "@/components/members/LocationFields";

/*
 * Every member (admins too, if they have a member record) must enter the country they
 * live in and their city. Until they do, this dialog shows after sign-in and cannot be
 * closed. It waits while the first-run setup form is open (that form asks for the same).
 */

const NO_GATE_PATHS = ["/login", "/register", "/activate", "/forgotpassword", "/resetpassword"];

/** The signed-in person's member record, or null when they have none (e.g. a superadmin). */
export function useMyMember() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["members", "me"],
    queryFn: async () => {
      try {
        const me = await charityClient.members.me();
        return me?.id ? me : null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(isAuthenticated),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** True while this person still has to enter their country and city. */
export function useLocationMissing() {
  const { data: me, isSuccess } = useMyMember();
  // Another page may have cached an empty record under the same key, so check the id.
  return Boolean(isSuccess && me?.id && !isLocationComplete(me));
}

export default function LocationGate() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const install = useInstallState();
  const { data: me } = useMyMember();
  const missing = useLocationMissing();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ country: "", city: "" });
  const [error, setError] = useState("");

  const onAuthPage = NO_GATE_PATHS.includes(location.pathname.toLowerCase());

  // Open once nothing else is on screen; once open it stays until saved.
  useEffect(() => {
    if (!missing) { setOpen(false); return; }
    if (open || onAuthPage || install.dialogOpen || install.autoHeld) return;
    setForm({ country: me?.country || "", city: me?.city || "" });
    setError("");
    setOpen(true);
  }, [missing, open, onAuthPage, install.dialogOpen, install.autoHeld, me]);

  // Keep the install popup (and the notifications step, which waits for it) back while open.
  useEffect(() => (open ? holdAutoInstall() : undefined), [open]);

  const save = useMutation({
    mutationFn: () => charityClient.members.updateMyLocation({ country: form.country, city: form.city.trim() }),
    onSuccess: (member) => {
      queryClient.setQueryData(["members", "me"], member);
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setOpen(false);
    },
    onError: (err) => setError(err?.message || "Could not save. Please try again."),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.country) return setError("Please choose the country you live in.");
    if (!form.city.trim()) return setError("Please enter your city.");
    setError("");
    save.mutate();
  };

  return (
    <Dialog open={open && missing} onOpenChange={() => { /* required: closes only after saving */ }}>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <MapPin className="h-6 w-6" />
          </div>
          <DialogTitle>Where do you live?</DialogTitle>
          <DialogDescription>
            Please tell us the country and city you live in now. This is needed for every member and only admins can see it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <LocationFields
            idPrefix="gate"
            country={form.country}
            city={form.city}
            phone={me?.phone}
            onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          />
          {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
