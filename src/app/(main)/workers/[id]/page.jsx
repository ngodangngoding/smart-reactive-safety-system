"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Cpu, Shield, ShieldAlert, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import TextInput, { labelClass, fieldClass } from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import Avatar from "@/components/atoms/Avatar.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import ResolveIncidentModal from "@/components/template/ResolveIncidentModal.jsx";
import Gauge from "@/components/telemetry/Gauge.jsx";
import LineChart from "@/components/telemetry/LineChart.jsx";
import HistorySection from "@/components/telemetry/HistorySection.jsx";
import GpsMapLazy, { GpsFooter } from "@/components/telemetry/GpsMapLazy.jsx";
import WidgetCard, { LiveBadge, RefreshButton, WidgetEmpty, WidgetSkeleton } from "@/components/telemetry/WidgetCard.jsx";
import { isStale, THRESHOLDS } from "@/lib/telemetryThresholds.js";
import { useSetBreadcrumbLabel } from "../../AuthContext.js";
import { getWorker, updateWorker, deleteWorker } from "@/services/workerService.js";
import { getWorkerMonitoring, deriveWorkerStatus, STATE_META } from "@/services/dashboardService.js";
import { getTelemetryHistory, getTelemetryRange } from "@/services/workerNodeService.js";
import { resolveIncident } from "@/services/incidentService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import { getWorkerDeletePreview } from "@/services/workerService.js";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";
import { useOrgContext } from "@/lib/orgContext.js";

const Schema = Yup.object({
  name: Yup.string().trim().required("Name is required"),
  workerCode: Yup.string().trim().required("Worker code is required"),
});

const POLL_INTERVAL_MS = 5000;
const HOUR_MS = 3600000;

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "status", label: "Worker Status" },
  { id: "environment", label: "Environment" },
  { id: "history", label: "History" },
];

function formatLocation(telemetry) {
  if (!telemetry || telemetry.latitude == null || telemetry.longitude == null) return null;
  return `${Number(telemetry.latitude).toFixed(5)}, ${Number(telemetry.longitude).toFixed(5)}`;
}

function Section({ id, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-20" aria-labelledby={`${id}-title`}>
      <div className="mb-3.5">
        <h2 id={`${id}-title`} className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SectionNav({ active, onChange }) {
  return (
    <div role="tablist" aria-label="Worker sections" className="inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-sm bg-segment-track-page p-[3px]">
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          role="tab"
          aria-selected={active === section.id}
          onClick={() => onChange(section.id)}
          className={`inline-flex h-[30px] cursor-pointer items-center whitespace-nowrap rounded-xs px-2.5 text-xs font-semibold transition-colors ${
            active === section.id ? "bg-card text-foreground shadow-segment" : "text-text-secondary hover:text-foreground"
          }`}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}

function SafetyStatusBody({ latest, incident }) {
  const kind = incident ? "danger" : !latest || isStale(latest.receivedAt) ? "unknown" : "safe";
  const cfg = {
    safe: {
      soft: "bg-success-soft",
      solid: "bg-success",
      text: "text-success-soft-foreground",
      Icon: ShieldCheck,
      title: "SOS not active",
      sub: "No SOS signal from this worker.",
    },
    danger: {
      soft: "bg-danger-soft",
      solid: "bg-danger",
      text: "text-danger-soft-foreground",
      Icon: ShieldAlert,
      title: "SOS active",
      sub: `SOS received ${incident ? formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true }) : ""}. Resolve it once the worker is safe.`,
    },
    unknown: {
      soft: "bg-neutral-soft",
      solid: "bg-neutral",
      text: "text-text-secondary",
      Icon: Shield,
      title: "Status unknown",
      sub: latest ? `No data since ${formatDistanceToNow(new Date(latest.receivedAt))} ago` : "No data received yet.",
    },
  }[kind];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
      <span className={`flex h-[76px] w-[76px] items-center justify-center rounded-full ${cfg.soft}`}>
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${cfg.solid}`}>
          <cfg.Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </span>
      </span>
      <div>
        <p className={`text-base font-bold ${cfg.text}`}>{cfg.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{cfg.sub}</p>
      </div>
    </div>
  );
}

function rangeLabels(t0, t1) {
  return Array.from({ length: 5 }, (_, i) => format(new Date(t0 + ((t1 - t0) * i) / 4), "HH:mm"));
}

function MotionChart({ title, unit, rows, keys, loading, onRefresh, window: [t0, t1], ariaLabel }) {
  const series = useMemo(
    () =>
      keys.map((k) => ({
        key: k.field,
        label: k.label,
        color: k.color,
        points: rows.map((r) => ({ t: new Date(r.receivedAt).getTime(), v: Number(r[k.field]) })).filter((p) => Number.isFinite(p.v)),
      })),
    [rows, keys]
  );
  return (
    <WidgetCard
      title={title}
      unit={unit}
      height={300}
      className="lg:col-span-2"
      controls={
        <>
          <RefreshButton onClick={onRefresh} loading={loading} />
          <LiveBadge />
        </>
      }
    >
      {loading && rows.length === 0 ? (
        <WidgetSkeleton />
      ) : rows.length === 0 ? (
        <WidgetEmpty>No readings in the last hour</WidgetEmpty>
      ) : (
        <div className="p-4">
          <LineChart series={series} xDomain={[t0, t1]} xLabels={rangeLabels(t0, t1)} height={150} decimals={2} ariaLabel={ariaLabel} />
        </div>
      )}
    </WidgetCard>
  );
}

const ACCEL_KEYS = [
  { field: "accelX", label: "Accel X", color: "var(--series-x)" },
  { field: "accelY", label: "Accel Y", color: "var(--series-y)" },
  { field: "accelZ", label: "Accel Z", color: "var(--series-z)" },
];
const GYRO_KEYS = [
  { field: "gyroX", label: "Gyro X", color: "var(--series-x)" },
  { field: "gyroY", label: "Gyro Y", color: "var(--series-y)" },
  { field: "gyroZ", label: "Gyro Z", color: "var(--series-z)" },
];

function GaugeCard({ metric, latest, height = 330 }) {
  const cfg = THRESHOLDS[metric];
  return (
    <WidgetCard title={cfg.label} unit={cfg.unit} height={height} controls={<LiveBadge />} showFooter updatedAt={latest?.receivedAt}>
      <Gauge metric={metric} value={latest ? Number(latest[metric]) : null} />
    </WidgetCard>
  );
}

function NoNodeCard() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <EmptyState
        icon={Cpu}
        title="No Worker Node assigned"
        description="Telemetry appears here once a device is connected to this worker."
        action={
          <Link href="/devices/add">
            <Button variant="secondary">Register a device</Button>
          </Link>
        }
      />
    </div>
  );
}

export default function WorkerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const setBreadcrumbLabel = useSetBreadcrumbLabel();

  const [worker, setWorker] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [lastHour, setLastHour] = useState({ rows: [], window: [0, 1] });
  const [loading, setLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState("overview");
  const visible = (id) => (id === "overview" ? tab === "overview" : tab === "overview" || tab === id);
  const { can } = useOrgContext();
  const { preview: deletePreview, loading: previewLoading } = useDeletePreview(deleteOpen ? id : null, getWorkerDeletePreview);
  const [resolving, setResolving] = useState(false);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const [workerData, monitoringData] = await Promise.all([getWorker(id), getWorkerMonitoring(id)]);
      setWorker(workerData);
      setMonitoring(monitoringData);
      setError(null);
      loadedOnce.current = true;
      setLoading(false);

      if (workerData.workerNode) {
        const now = Date.now();
        const [recent, hour] = await Promise.all([
          getTelemetryHistory(workerData.workerNode.id, 10),
          getTelemetryRange(workerData.workerNode.id, new Date(now - HOUR_MS), new Date(now + 60000)),
        ]);
        setTelemetryHistory(recent);
        setLastHour({ rows: hour, window: [now - HOUR_MS, now] });
      }
    } catch (err) {
      if (!loadedOnce.current) setError(err.response?.data?.message || "Failed to load worker");
      else toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
      setTelemetryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const run = () => load();
    run();
    const timer = setInterval(run, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const workerName = worker?.name;
  useEffect(() => {
    setBreadcrumbLabel(workerName);
  }, [workerName, setBreadcrumbLabel]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { name: worker?.name ?? "", workerCode: worker?.workerCode ?? "", isActive: worker?.isActive ?? true },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { data: updated, message } = await updateWorker(id, values);
        setWorker((prev) => ({ ...prev, ...updated }));
        toast.success(message);
      } catch (error) {
        if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
  });
  useDirtyGuard(formik.dirty);

  if (loading) {
    return (
      <div className="flex flex-col gap-5" role="status" aria-busy="true" aria-label="Loading worker">
        <div className="h-12 w-72 animate-pulse rounded-md bg-border-subtle" />
        <div className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[360px] rounded-lg bg-border-subtle" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState icon={TriangleAlert} tone="danger" title={error} />
      </div>
    );
  }

  const node = worker.workerNode;
  const latest = monitoring?.latestTelemetry;
  const incident = monitoring?.activeIncident;
  const status = deriveWorkerStatus({ worker, workerNode: node, latestTelemetry: latest, activeIncident: incident });
  const meta = STATE_META[status.state];
  const emergency = status.state === "EMERGENCY" && incident;
  const location = formatLocation(latest);

  const mapPopup = latest && (
    <div className="min-w-[180px] space-y-1.5">
      <p className="text-sm font-semibold text-foreground">{worker.name}</p>
      <Badge variant={meta.variant} withDot>
        {meta.label}
      </Badge>
      <dl className="space-y-1 border-t border-border-subtle pt-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Battery</dt>
          <dd className="font-medium text-foreground">
            {Math.round(latest.batteryPercent)}% ({Number(latest.batteryVoltage).toFixed(2)} V)
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Last Update</dt>
          <dd className="font-medium text-foreground">{status.lastUpdateAt ? formatDistanceToNow(new Date(status.lastUpdateAt), { addSuffix: true }) : "-"}</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Avatar name={worker.name} size={48} danger={Boolean(emergency)} />
          <div>
            <h1 className="text-2xl font-bold leading-tight text-foreground">{worker.name}</h1>
            <p className="text-[13px] text-muted-foreground">{worker.workerCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={meta.variant} withDot className="!h-[26px] !text-xs">
            {meta.label}
          </Badge>
          {can("worker", "canDelete") && <IconButton icon={Trash2} danger variant="bordered" label="Delete worker" onClick={() => setDeleteOpen(true)} />}
        </div>
      </div>

      {emergency && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger-border bg-danger-tint px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-danger-soft">
              <TriangleAlert className="h-[18px] w-[18px] text-danger" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-danger-soft-foreground">
                Emergency reported {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
              </p>
              <p className="text-xs tabular-nums text-text-secondary">
                Last known location {location ?? "unavailable"}
              </p>
            </div>
          </div>
          <Button variant="danger" onClick={() => setResolving("confirm")}>
            Resolve Incident
          </Button>
        </div>
      )}

      <SectionNav active={tab} onChange={setTab} />

      <div className="flex flex-col gap-7">
        {visible("overview") && (
        <Section id="overview" title="Overview" description="Worker profile, latest reading and recent telemetry.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <WidgetCard title="Worker Details" height={360}>
              <form onSubmit={formik.handleSubmit} noValidate className="flex flex-1 flex-col gap-4 p-4">
                <TextInput
                  id="name"
                  name="name"
                  label="Name"
                  required
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.name}
                  touched={formik.touched.name}
                />
                <div>
                  <label htmlFor="workerCode" className={labelClass}>Worker Code</label>
                  <input
                    id="workerCode"
                    name="workerCode"
                    value={formik.values.workerCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`${fieldClass} ${formik.errors.workerCode && formik.touched.workerCode ? "border-danger" : "border-border-strong"}`}
                  />
                  {formik.errors.workerCode && formik.touched.workerCode && <p className="mt-1.5 text-[11px] text-danger">{formik.errors.workerCode}</p>}
                </div>
                <label className="flex items-center gap-2.5 text-[13px] text-foreground">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formik.values.isActive}
                    onChange={formik.handleChange}
                    className="h-4 w-4 rounded border-border-strong accent-primary"
                  />
                  Active
                </label>
                <Button type="submit" loading={formik.isSubmitting} className="mt-auto self-end">
                  Save Changes
                </Button>
              </form>
            </WidgetCard>

            <WidgetCard title="Latest Telemetry" height={360} controls={node ? <LiveBadge /> : null}>
              {node ? (
                <dl className="px-4 py-1 text-[13px]">
                  {[
                    [
                      "Worker Node",
                      <Link key="n" href={`/devices/${node.id}`} className="inline-flex items-center gap-1 text-foreground hover:text-primary hover:underline">
                        <Cpu className="h-3.5 w-3.5" aria-hidden="true" /> #{node.deviceWorkerId}
                      </Link>,
                    ],
                    ["Worker ID", worker.workerCode],
                    ["Organization", worker.organization?.name ?? "—"],
                    [
                      "Battery",
                      latest ? (
                        <span className={latest.batteryPercent < 20 ? "text-warning-soft-foreground" : ""}>{Math.round(latest.batteryPercent)}%</span>
                      ) : (
                        "—"
                      ),
                    ],
                    ["Location", location ?? <span className="text-text-disabled">Unavailable</span>],
                    [
                      "Last Update",
                      status.lastUpdateAt ? formatDistanceToNow(new Date(status.lastUpdateAt), { addSuffix: true }) : <span className="text-text-disabled">No data</span>,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b border-border-faint py-[11px] last:border-b-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-semibold tabular-nums text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="p-4 text-[13px] text-muted-foreground">
                  No Worker Node assigned. Register one from{" "}
                  <Link href="/devices/add" className="text-foreground hover:text-primary hover:underline">
                    Device Management
                  </Link>
                  .
                </p>
              )}
            </WidgetCard>

            {node && (
              <WidgetCard title="Recent Telemetry" unit="last 10" height={360} className="lg:col-span-2">
                {telemetryLoading ? (
                  <WidgetSkeleton />
                ) : telemetryHistory.length === 0 ? (
                  <WidgetEmpty>No telemetry received yet.</WidgetEmpty>
                ) : (
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr>
                          {["Received", "SOS", "Battery", "Location"].map((h) => (
                            <th key={h} scope="col" className="sticky top-0 bg-surface-subtle px-4 py-2 text-left text-xs font-medium text-text-th">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {telemetryHistory.map((reading) => (
                          <tr key={reading.id}>
                            <td className="whitespace-nowrap border-b border-border-faint px-4 py-[9px] tabular-nums text-muted-foreground">
                              {format(new Date(reading.receivedAt), "MMM d, HH:mm:ss")}
                            </td>
                            <td className="border-b border-border-faint px-4 py-[9px]">
                              <Badge variant={reading.sos ? "danger" : "gray"} className="!h-5">
                                {reading.sos ? "SOS" : "Normal"}
                              </Badge>
                            </td>
                            <td className="border-b border-border-faint px-4 py-[9px] tabular-nums text-muted-foreground">
                              {Math.round(reading.batteryPercent)}%
                            </td>
                            <td className="whitespace-nowrap border-b border-border-faint px-4 py-[9px] tabular-nums text-muted-foreground">
                              {formatLocation(reading) ?? "Unavailable"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </WidgetCard>
            )}
          </div>
        </Section>
        )}

        {visible("status") && (
        <Section id="status" title="Worker Status" description="Live safety, power and position of the worker.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-5">
            {node ? (
              <>
              <WidgetCard title="Safety Status" height={330} controls={<LiveBadge />} showFooter updatedAt={latest?.receivedAt} danger={Boolean(emergency)}>
                <SafetyStatusBody latest={latest} incident={incident} />
              </WidgetCard>
              <GaugeCard metric="batteryVoltage" latest={latest} />
              <GaugeCard metric="batteryPercent" latest={latest} />
              </>
            ) : (
              <div className="lg:col-span-2 xl:col-span-3"><NoNodeCard /></div>
            )}
            <WidgetCard title="GPS" height={330} className="lg:col-span-2" controls={node ? <LiveBadge /> : null}>
              <GpsMapLazy
                lat={latest?.latitude == null ? undefined : Number(latest.latitude)}
                lng={latest?.longitude == null ? undefined : Number(latest.longitude)}
                state={status.state}
                popup={mapPopup}
              />
              {latest?.latitude != null && latest?.longitude != null && <GpsFooter lat={latest.latitude} lng={latest.longitude} />}
            </WidgetCard>
          </div>
        </Section>
        )}

        {visible("environment") && (
        <Section id="environment" title="Environment" description="Conditions around the worker and device movement.">
          {node ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <GaugeCard metric="temperature" latest={latest} height={300} />
              <GaugeCard metric="humidity" latest={latest} height={300} />
              <MotionChart
                title="Acceleration"
                unit="m/s²"
                rows={lastHour.rows}
                keys={ACCEL_KEYS}
                loading={telemetryLoading}
                onRefresh={load}
                window={lastHour.window}
                ariaLabel="Acceleration over the last hour"
              />
              <GaugeCard metric="pressure" latest={latest} height={300} />
              <GaugeCard metric="altitude" latest={latest} height={300} />
              <MotionChart
                title="Gyroscope"
                unit="°/s"
                rows={lastHour.rows}
                keys={GYRO_KEYS}
                loading={telemetryLoading}
                onRefresh={load}
                window={lastHour.window}
                ariaLabel="Gyroscope over the last hour"
              />
            </div>
          ) : (
            <NoNodeCard />
          )}
        </Section>
        )}

        {visible("history") && (
        <Section id="history" title="History" description="Readings, SOS events and route for a selected day.">
          {node ? <HistorySection nodeId={node.id} workerId={worker.id} deviceWorkerId={node.deviceWorkerId} /> : <NoNodeCard />}
        </Section>
        )}
      </div>

      <DeleteConfirmationModal
        open={deleteOpen}
        title="Delete this worker?"
        description={`"${worker.name}" will be soft-deleted together with their device, telemetry, and incidents.`}
        details={deletePreview ? `Will also be deleted: ${formatCascade(deletePreview) || "nothing else"}.` : null}
        detailsLoading={previewLoading}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { message } = await deleteWorker(id);
            toast.success(message);
            router.push("/workers");
          } catch (error) {
            toast.error(apiErrorMessage(error));
            setDeleting(false);
          }
        }}
        onClose={() => setDeleteOpen(false)}
      />

      {resolving && incident && (
        <ResolveIncidentModal
          incident={incident}
          worker={worker}
          loading={resolving === "loading"}
          onConfirm={async () => {
            setResolving("loading");
            try {
              const { message } = await resolveIncident(incident.id);
              toast.success(message);
              setResolving(false);
              await load();
            } catch (error) {
              toast.error(apiErrorMessage(error));
              setResolving("confirm");
            }
          }}
          onClose={() => setResolving(false)}
        />
      )}
    </div>
  );
}
