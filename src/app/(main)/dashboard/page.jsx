"use client";

import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/apiError.js";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { TriangleAlert, Users, Wifi, WifiOff } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import StatCard from "@/components/organisms/StatCard.jsx";
import ActiveAlertsPanel from "@/components/organisms/ActiveAlertsPanel.jsx";
import { useEmergencyAlarm, ALARM_SRC } from "@/lib/useEmergencyAlarm.js";
import WorkerMonitoringTable from "@/components/organisms/WorkerMonitoringTable.jsx";
import ResolveIncidentModal from "@/components/template/ResolveIncidentModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getMonitoring, summarizeMonitoring, getDashboardSummary } from "@/services/dashboardService.js";
import { getIncidents, resolveIncident } from "@/services/incidentService.js";
import { useOrgContext } from "@/lib/orgContext.js";

const MapSkeleton = () => <div className="h-full min-h-[360px] animate-pulse rounded-lg border border-border bg-border-subtle" />;

const MonitoringMap = dynamic(() => import("@/components/organisms/MonitoringMap.jsx"), {
  ssr: false,
  loading: MapSkeleton,
});

const POLL_INTERVAL_MS = 5000;

function DeviceQuotaBar({ usage }) {
  const percent = Math.min(100, Math.round((usage.used / usage.max) * 100));
  const full = usage.used >= usage.max;
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">Device license usage</span>
        <span className={`tabular-nums ${full ? "font-semibold text-danger-soft-foreground" : "text-muted-foreground"}`}>
          {usage.used} / {usage.max} devices
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Device license usage"
        aria-valuemin={0}
        aria-valuemax={usage.max}
        aria-valuenow={Math.min(usage.used, usage.max)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-border-subtle"
      >
        <div className={`h-full rounded-full ${full ? "bg-danger" : "bg-primary"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-border bg-card">
      <EmptyState
        icon={TriangleAlert}
        tone="danger"
        title={message}
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { organizationId } = useOrgContext();
  const showOrganization = user.role === "SUPERADMIN" && !organizationId;

  const [monitoring, setMonitoring] = useState([]);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [monitoringError, setMonitoringError] = useState(null);
  const [summary, setSummary] = useState(null);

  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState(null);

  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  const loadMonitoring = useCallback(async () => {
    try {
      const data = await getMonitoring(organizationId);
      setMonitoring(data);
      setMonitoringError(null);
    } catch (error) {
      setMonitoringError(apiErrorMessage(error));
    } finally {
      setMonitoringLoading(false);
    }
  }, [organizationId]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getDashboardSummary(organizationId));
    } catch {
    }
  }, [organizationId]);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await getIncidents({ status: "ACTIVE", pageSize: 100, organizationId: organizationId || undefined });
      setIncidents(data.items);
      setIncidentsError(null);
    } catch (error) {
      setIncidentsError(apiErrorMessage(error));
    } finally {
      setIncidentsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const refresh = () => {
      loadMonitoring();
      loadIncidents();
      loadSummary();
    };
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadMonitoring, loadIncidents, loadSummary]);

  const handleConfirmResolve = async () => {
    if (!resolveTarget) return;
    setResolvingId(resolveTarget.incident.id);
    try {
      const { message } = await resolveIncident(resolveTarget.incident.id);
      toast.success(message);
      setResolveTarget(null);
      await Promise.all([loadMonitoring(), loadIncidents()]);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setResolvingId(null);
    }
  };

  const stats = summarizeMonitoring(monitoring);
  const hasEmergency = stats.emergency > 0;
  const { audioRef: alarmAudioRef, sounding: alarmSounding, mute: muteAlarm } = useEmergencyAlarm(stats.emergency);

  return (
    <>
      <audio ref={alarmAudioRef} src={ALARM_SRC} loop preload="auto" />

      <PageHeader title="Monitoring Dashboard">
        <span className="inline-flex h-7 items-center gap-[7px] rounded-xs border border-border bg-card px-2.5 text-xs font-semibold text-success-soft-foreground">
          <span className="h-[7px] w-[7px] rounded-full bg-success" aria-hidden="true" />
          Live
        </span>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={TriangleAlert}
          label="Emergency"
          loading={monitoringLoading}
          value={stats.emergency}
          accent="danger"
          emphasize={hasEmergency}
          note={hasEmergency ? "Needs response" : undefined}
          noteClassName="font-semibold text-danger-soft-foreground"
        />
        <StatCard icon={Users} label="Total Active" loading={monitoringLoading} value={stats.totalActive} accent="primary" />
        <StatCard icon={Wifi} label="Online" loading={monitoringLoading} value={stats.online} accent="success" note={`of ${stats.totalActive}`} />
        <StatCard icon={WifiOff} label="Offline" loading={monitoringLoading} value={stats.offline} accent="neutral" note={`of ${stats.totalActive}`} />
      </div>

      {summary && summary.deviceUsage.max > 0 && <DeviceQuotaBar usage={summary.deviceUsage} />}

      <div className="grid grid-cols-1 gap-4 xl:h-[440px] xl:grid-cols-3">
        <div className="min-h-[360px] xl:col-span-2 xl:min-h-0">
          {monitoringError ? (
            <ErrorCard message={monitoringError} onRetry={loadMonitoring} />
          ) : monitoringLoading ? (
            <MapSkeleton />
          ) : (
            <MonitoringMap entries={monitoring} selectedId={selectedWorkerId} onSelectWorker={setSelectedWorkerId} />
          )}
        </div>

        <div className="min-h-[240px] xl:min-h-0">
          {incidentsError ? (
            <ErrorCard message={incidentsError} onRetry={loadIncidents} />
          ) : (
            <ActiveAlertsPanel
              incidents={incidents}
              loading={incidentsLoading}
              onResolve={(incident, worker) => setResolveTarget({ incident, worker })}
              resolvingId={resolvingId}
              alarmSounding={alarmSounding}
              onMuteAlarm={muteAlarm}
            />
          )}
        </div>
      </div>

      <WorkerMonitoringTable
        entries={monitoring}
        loading={monitoringLoading}
        error={monitoringError}
        onRetry={loadMonitoring}
        showOrganization={showOrganization}
        onResolve={(incident, worker) => setResolveTarget({ incident, worker })}
        resolvingId={resolvingId}
        selectedId={selectedWorkerId}
        onSelectWorker={setSelectedWorkerId}
      />

      {resolveTarget && (
        <ResolveIncidentModal
          incident={resolveTarget.incident}
          worker={resolveTarget.worker}
          loading={resolvingId === resolveTarget.incident.id}
          onConfirm={handleConfirmResolve}
          onClose={() => setResolveTarget(null)}
        />
      )}
    </>
  );
}
