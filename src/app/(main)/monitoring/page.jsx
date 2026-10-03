"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import WorkerMonitoringTable from "@/components/organisms/WorkerMonitoringTable.jsx";
import EmergencyAlarm from "@/components/organisms/EmergencyAlarm.jsx";
import ResolveIncidentModal from "@/components/template/ResolveIncidentModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getMonitoring } from "@/services/dashboardService.js";
import { resolveIncident } from "@/services/incidentService.js";
import { apiErrorMessage } from "@/lib/apiError.js";
import { useOrgContext } from "@/lib/orgContext.js";

const MapSkeleton = () => <div className="h-full min-h-[360px] animate-pulse rounded-lg border border-border bg-border-subtle" />;
const MonitoringMap = dynamic(() => import("@/components/organisms/MonitoringMap.jsx"), { ssr: false, loading: MapSkeleton });

const POLL_INTERVAL_MS = 5000;

export default function MonitoringPage() {
  const { user } = useAuth();
  const { organizationId } = useOrgContext();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getMonitoring(organizationId);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    const run = () => load();
    run();
    const timer = setInterval(run, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleConfirmResolve = async (note) => {
    setResolvingId(resolveTarget.incident.id);
    try {
      const { message } = await resolveIncident(resolveTarget.incident.id, note);
      toast.success(message);
      setResolveTarget(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setResolvingId(null);
    }
  };

  const emergencyCount = entries.filter((entry) => entry.activeIncident).length;

  return (
    <>
      <EmergencyAlarm count={emergencyCount} />

      <PageHeader title="Monitoring" />

      <div className="h-[420px]">
        {error ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-danger">{error}</p>
        ) : loading ? (
          <MapSkeleton />
        ) : (
          <MonitoringMap entries={entries} selectedId={selectedWorkerId} onSelectWorker={setSelectedWorkerId} />
        )}
      </div>

      <WorkerMonitoringTable
        entries={entries}
        loading={loading}
        error={error}
        onRetry={load}
        showOrganization={user.role === "SUPERADMIN" && !organizationId}
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
