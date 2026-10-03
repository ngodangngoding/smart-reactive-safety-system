"use client";

import { format } from "date-fns";
import Badge from "@/components/atoms/Badge.jsx";
import { useAuth } from "../../AuthContext.js";

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function SettingsGooglePage() {
  const { user } = useAuth();
  const linked = Boolean(user.googleLinkedAt);

  return (
    <>
      <h2 className="text-xl font-bold text-foreground">Google Account</h2>

      <section className="rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Google sign-in</h3>
          {linked ? (
            <Badge variant="success" withDot>
              Connected
            </Badge>
          ) : (
            <Badge variant="gray">Not connected</Badge>
          )}
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Linked email">{linked ? user.email : <span className="text-text-disabled">-</span>}</Field>
          <Field label="Linked since">{linked ? format(new Date(user.googleLinkedAt), "d MMM yyyy") : <span className="text-text-disabled">-</span>}</Field>
        </dl>

        <p className="mt-5 text-xs text-muted-foreground">
          {linked
            ? "You can sign in with the Google account that uses this email."
            : `Sign in once with the Google account that uses ${user.email} and it is linked automatically.`}
        </p>
      </section>
    </>
  );
}
