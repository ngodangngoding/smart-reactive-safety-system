"use client";

import { useCallback, useEffect, useState } from "react";
import DetailPageSkeleton from "@/components/organisms/DetailPageSkeleton.jsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import Select from "@/components/atoms/Select.jsx";
import TextInput from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import WidgetCard from "@/components/telemetry/WidgetCard.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { getWorkerNode, updateWorkerNode, deleteWorkerNode, getLatestTelemetry } from "@/services/workerNodeService.js";
import { getWorkerOptions } from "@/services/workerService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import { getWorkerNodeDeletePreview } from "@/services/workerNodeService.js";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";
import { useOrgContext } from "@/lib/orgContext.js";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function DeviceDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [node, setNode] = useState(null);
  const [latest, setLatest] = useState(null);
  const [reassignOptions, setReassignOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { can } = useOrgContext();
  const { preview: deletePreview, loading: previewLoading } = useDeletePreview(deleteOpen ? id : null, getWorkerNodeDeletePreview);

  const load = useCallback(async () => {
    try {
      const nodeData = await getWorkerNode(id);
      setNode(nodeData);
      const [latestReading, workers] = await Promise.all([
        getLatestTelemetry(nodeData.id).catch(() => null),
        getWorkerOptions({ unassigned: true, organizationId: nodeData.organizationId }),
      ]);
      setLatest(latestReading);
      setReassignOptions(nodeData.worker ? [nodeData.worker, ...workers] : workers);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load worker node");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const run = () => load();
    run();
  }, [load]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { deviceWorkerId: node?.deviceWorkerId ?? "", isActive: node?.isActive ?? true, workerId: node?.workerId ?? "" },
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { data: updated, message } = await updateWorkerNode(id, { ...values, deviceWorkerId: Number(values.deviceWorkerId) });
        toast.success(message);
        await load();
        setSubmitting(false);
        return updated;
      } catch (error) {
        if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
        setSubmitting(false);
      }
    },
  });
  useDirtyGuard(formik.dirty);

  if (loading) {
    return (
      <DetailPageSkeleton fields={4} className="" />
    );
  }

  if (error) {
    return <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-danger">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-foreground">Worker Node #{node.deviceWorkerId}</h1>
          <p className="text-[13px] text-muted-foreground">
            Assigned to{" "}
            <Link href={`/workers/${node.worker.id}`} className="text-foreground hover:text-primary hover:underline">
              {node.worker.name}
            </Link>
          </p>
        </div>
        {can("workerNode", "canDelete") && (
          <IconButton icon={Trash2} danger variant="bordered" label="Delete worker node" onClick={() => setDeleteOpen(true)} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WidgetCard title="Device Settings" height={440}>
          <form onSubmit={formik.handleSubmit} className="flex flex-1 flex-col gap-4 p-4">
            <TextInput
              id="deviceWorkerId"
              name="deviceWorkerId"
              type="number"
              label="Device ID (worker_id)"
              required
              value={formik.values.deviceWorkerId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                name="isActive"
                checked={formik.values.isActive}
                onChange={formik.handleChange}
                className="h-4 w-4 rounded border-border-strong accent-primary"
              />
              Active (accepts incoming telemetry)
            </label>

            <Select
              id="workerId"
              name="workerId"
              label="Reassign to Worker"
              options={reassignOptions.map((worker) => ({ value: worker.id, label: `${worker.name} (${worker.workerCode})` }))}
              value={formik.values.workerId}
              onChange={formik.handleChange}
            />

            <Button type="submit" loading={formik.isSubmitting} className="mt-auto self-end">
              Save Changes
            </Button>
          </form>
        </WidgetCard>

        <WidgetCard title="Latest Reading" height={440}>
          {latest ? (
            <dl className="divide-y divide-border-subtle px-4">
              <Row label="Status">{latest.sos ? <Badge variant="danger">SOS</Badge> : <Badge variant="success">Normal</Badge>}</Row>
              <Row label="Battery">{Math.round(latest.batteryPercent)}%</Row>
              <Row label="Received">{formatDistanceToNow(new Date(latest.receivedAt), { addSuffix: true })}</Row>
            </dl>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">This device has not sent telemetry yet.</p>
          )}
        </WidgetCard>
      </div>

      <DeleteConfirmationModal
        open={deleteOpen}
        title="Delete this Worker Node?"
        description={`Node #${node.deviceWorkerId} will be soft-deleted and stop accepting telemetry. The worker stays and can get a new device.`}
        details={deletePreview ? `Will also be deleted: ${formatCascade(deletePreview) || "nothing else"}.` : null}
        detailsLoading={previewLoading}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { message } = await deleteWorkerNode(id);
            toast.success(message);
            router.push("/devices");
          } catch (error) {
            toast.error(apiErrorMessage(error));
            setDeleting(false);
          }
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
