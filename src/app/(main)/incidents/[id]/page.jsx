"use client";

import { useCallback, useEffect, useState } from "react";
import DetailPageSkeleton from "@/components/organisms/DetailPageSkeleton.jsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { MapPinOff, Trash2 } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import Button from "@/components/atoms/Button.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import Avatar from "@/components/atoms/Avatar.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import WidgetCard from "@/components/telemetry/WidgetCard.jsx";
import GpsMapLazy, { GpsFooter } from "@/components/telemetry/GpsMapLazy.jsx";
import ResolveIncidentModal from "@/components/template/ResolveIncidentModal.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth, useSetBreadcrumbLabel } from "../../AuthContext.js";
import { getIncident, resolveIncident, deleteIncident } from "@/services/incidentService.js";
import { useOrgContext } from "@/lib/orgContext.js";
import { apiErrorMessage } from "@/lib/apiError.js";

const dateTime = (value) => (value ? format(new Date(value), "MMM d, yyyy HH:mm:ss") : "-");

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { user } = useAuth();
  const { can } = useOrgContext();
  const { id } = useParams();
  const router = useRouter();
  const setBreadcrumbLabel = useSetBreadcrumbLabel();

  const [incident, setIncident] = useState(null);
  const [error, setError] = useState(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIncident(await getIncident(id));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    const run = () => load();
    run();
  }, [load]);

  const workerName = incident?.worker?.name;
  useEffect(() => {
    setBreadcrumbLabel(workerName ? `Incident - ${workerName}` : "Incident");
  }, [workerName, setBreadcrumbLabel]);

  if (error) return <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-danger">{error}</p>;
  if (!incident) {
    return (
      <DetailPageSkeleton fields={2} stats className="" />
    );
  }

  const active = incident.status === "ACTIVE";
  const hasLocation = incident.latitude != null && incident.longitude != null;
  const trigger = incident.triggerTelemetry;

  const mapPopup = (
    <div className="min-w-[180px] space-y-1.5">
      <div>
        <p className="text-sm font-semibold text-foreground">{incident.worker?.name ?? "Unknown worker"}</p>
        {incident.worker?.workerCode && <p className="text-xs text-muted-foreground">{incident.worker.workerCode}</p>}
      </div>
      <Badge variant={active ? "danger" : "success"} withDot>
        {active ? "Active" : "Resolved"}
      </Badge>
      <dl className="space-y-1 border-t border-border-subtle pt-1.5 text-xs">
        {trigger && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Battery</dt>
            <dd className="font-medium text-foreground">
              {Math.round(trigger.batteryPercent)}% ({Number(trigger.batteryVoltage).toFixed(2)} V)
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Altitude</dt>
          <dd className="font-medium text-foreground">{incident.altitude != null ? `${Number(incident.altitude).toFixed(1)} m` : "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Satellites</dt>
          <dd className="font-medium text-foreground">{incident.satellites ?? "-"}</dd>
        </div>
      </dl>
    </div>
  );

  const handleResolve = async (note) => {
    setBusy(true);
    try {
      const { message } = await resolveIncident(incident.id, note);
      toast.success(message);
      setResolveOpen(false);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const { message } = await deleteIncident(incident.id);
      toast.success(message);
      router.push("/incidents");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Avatar name={incident.worker?.name ?? "Unknown worker"} size={48} danger={active} />
          <div>
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              {incident.worker ? (
                <Link href={`/workers/${incident.worker.id}`} className="hover:text-primary hover:underline">
                  {incident.worker.name}
                </Link>
              ) : (
                "Unknown worker"
              )}
            </h1>
            <p className="text-[13px] text-muted-foreground">{incident.worker?.workerCode ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={active ? "danger" : "success"} withDot className="!h-[26px] !text-xs">
            {active ? "Emergency" : "Resolved"}
          </Badge>
          {active && can("incident", "canUpdate") && (
            <Button variant="danger" onClick={() => setResolveOpen(true)}>
              Resolve
            </Button>
          )}
          {!active && user.role === "SUPERADMIN" && (
            <IconButton icon={Trash2} danger variant="bordered" label="Delete incident" onClick={() => setDeleteOpen(true)} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WidgetCard title="Incident Details" height={440}>
          <dl className="divide-y divide-border-subtle overflow-y-auto px-4">
            <Row label="Worker Node">{incident.workerNode ? `Node #${incident.workerNode.deviceWorkerId}` : "-"}</Row>
            {user.role === "SUPERADMIN" && <Row label="Organization">{incident.organization?.name ?? "-"}</Row>}
            <Row label="Started">{dateTime(incident.startedAt)}</Row>
            <Row label="Resolved">{dateTime(incident.resolvedAt)}</Row>
            <Row label="Resolved by">{incident.resolvedBy?.name ?? "-"}</Row>
            <Row label="Altitude">{incident.altitude != null ? `${Number(incident.altitude).toFixed(1)} m` : "-"}</Row>
            <Row label="Satellites">{incident.satellites ?? "-"}</Row>
            {incident.resolutionNote && (
              <div className="py-2.5">
                <dt className="text-xs text-muted-foreground">Resolution note</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{incident.resolutionNote}</dd>
              </div>
            )}
          </dl>
        </WidgetCard>

        <WidgetCard title="Location" height={440}>
          {hasLocation ? (
            <>
              <GpsMapLazy lat={Number(incident.latitude)} lng={Number(incident.longitude)} state={active ? "EMERGENCY" : "NORMAL"} popup={mapPopup} />
              <GpsFooter lat={incident.latitude} lng={incident.longitude} />
            </>
          ) : (
            <EmptyState icon={MapPinOff} title="Location unavailable" description="The device reported no valid position for this emergency." className="flex-1" />
          )}
        </WidgetCard>
      </div>

      {trigger && (
        <WidgetCard title="Reading that raised the emergency" height={180}>
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
            {[
              ["Received", dateTime(trigger.receivedAt)],
              ["Battery", `${Math.round(trigger.batteryPercent)}% (${Number(trigger.batteryVoltage).toFixed(2)} V)`],
              ["Temperature", `${Number(trigger.temperature).toFixed(1)} C`],
              ["Humidity", `${Math.round(trigger.humidity)}%`],
              ["Pressure", `${Math.round(trigger.pressure)} hPa`],
              ["Sequence", trigger.sequence],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </WidgetCard>
      )}

      {resolveOpen && <ResolveIncidentModal incident={incident} worker={incident.worker} loading={busy} onConfirm={handleResolve} onClose={() => setResolveOpen(false)} />}

      <DeleteConfirmationModal
        open={deleteOpen}
        title="Delete this incident?"
        description="The resolved incident is removed from history. Its telemetry stays untouched."
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
