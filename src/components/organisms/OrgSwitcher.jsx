"use client";

import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/apiError.js";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Building2, ChevronDown, Home, TriangleAlert } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import { useOrgContext } from "@/lib/orgContext.js";
import { enterOrganization, exitOrganization, getOrganizationOptions } from "@/services/organizationService.js";

const HOME_LABEL = "Super Admin (Home)";

function DiscardModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="discard-title" className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg bg-card p-5 shadow-overlay sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-soft">
            <TriangleAlert className="h-5 w-5 text-warning" aria-hidden="true" />
          </span>
          <div>
            <h2 id="discard-title" className="text-base font-semibold text-foreground">Discard changes?</h2>
            <p className="mt-1 text-sm text-muted-foreground">You have unsaved changes. Switching organization will discard them.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Discard and switch</Button>
        </div>
      </div>
    </div>
  );
}

export default function OrgSwitcher({ isOpen = true, onActingAsChange }) {
  const router = useRouter();
  const { actingAsOrg } = useOrgContext();
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [switching, setSwitching] = useState(false);

  const activeOrgId = actingAsOrg?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    getOrganizationOptions()
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const run = async (target) => {
    setSwitching(true);
    try {
      if (target.type === "home") {
        exitOrganization();
        onActingAsChange?.(null);
        setOpen(false);
        router.push("/organizations");
      } else {
        await enterOrganization(target.org);
        onActingAsChange?.({ id: target.org.id, name: target.org.name });
        setOpen(false);
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSwitching(false);
    }
  };

  const request = (target) => {
    if (window.__saDirty === true) {
      setPendingSwitch(target);
      return;
    }
    run(target);
  };

  const filtered = organizations.filter((org) => org.name.toLowerCase().includes(search.trim().toLowerCase()));

  const itemClass = (active) =>
    `flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      active ? "bg-primary/10 font-bold text-primary" : "text-foreground"
    }`;

  return (
    <div ref={containerRef} className="relative">
      {isOpen ? (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[6px] border border-border-strong bg-card px-2.5 text-xs font-semibold text-foreground hover:border-primary"
        >
          <Building2 className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">{actingAsOrg?.name ?? HOME_LABEL}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          title="Switch Organization"
          aria-label="Switch Organization"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[6px] border border-border-strong bg-card hover:border-primary"
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div className="absolute bottom-full z-[9999] mb-2 w-full overflow-hidden rounded-[6px] border border-border bg-card shadow-overlay">
          <div className="border-b border-border-subtle p-2">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search organization..."
              aria-label="Search organization"
              className="h-8 w-full rounded-[6px] border border-border-strong bg-card px-2.5 text-[11px] text-foreground placeholder:text-text-disabled"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto" role="listbox" aria-label="Organizations">
            <button type="button" role="option" aria-selected={!activeOrgId} disabled={switching} onClick={() => request({ type: "home" })} className={itemClass(!activeOrgId)}>
              <span className="flex items-center gap-2">
                <Home className="h-3.5 w-3.5" aria-hidden="true" />
                {HOME_LABEL}
              </span>
            </button>
            <div className="h-px bg-border-subtle" />
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[11px] italic text-muted-foreground">No organizations found</p>
            ) : (
              filtered.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  role="option"
                  aria-selected={org.id === activeOrgId}
                  disabled={switching}
                  onClick={() => request({ type: "org", org })}
                  className={itemClass(org.id === activeOrgId)}
                >
                  <span className="min-w-0 flex-1 truncate">{org.name}</span>
                  {org.license?.name && (
                    <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-bold">{org.license.name}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {pendingSwitch && (
        <DiscardModal
          onCancel={() => setPendingSwitch(null)}
          onConfirm={() => {
            const target = pendingSwitch;
            setPendingSwitch(null);
            window.__saDirty = false;
            run(target);
          }}
        />
      )}
    </div>
  );
}
