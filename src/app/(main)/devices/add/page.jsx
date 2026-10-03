"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import TextInput from "@/components/atoms/TextInput.jsx";
import Select from "@/components/atoms/Select.jsx";
import Button from "@/components/atoms/Button.jsx";
import { registerWorkerNode } from "@/services/workerNodeService.js";
import { getWorkerOptions } from "@/services/workerService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";

const Schema = Yup.object({
  deviceWorkerId: Yup.number().typeError("Device ID must be a number").required("Device ID is required"),
  workerId: Yup.string().required("Select a Worker to assign this device to"),
});

export default function AddDevicePage() {
  const router = useRouter();
  const [unassignedWorkers, setUnassignedWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  useEffect(() => {
    getWorkerOptions({ unassigned: true })
      .then(setUnassignedWorkers)
      .catch(() => {})
      .finally(() => setLoadingWorkers(false));
  }, []);

  const formik = useFormik({
    initialValues: { deviceWorkerId: "", workerId: "" },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { message } = await registerWorkerNode({ deviceWorkerId: Number(values.deviceWorkerId), workerId: values.workerId });
        toast.success(message);
        router.push("/devices");
      } catch (error) {
        if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
  });
  useDirtyGuard(formik.dirty);

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-lg font-semibold text-foreground">Register Device</h1>
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-6">
        <TextInput
          id="deviceWorkerId"
          name="deviceWorkerId"
          type="number"
          label="Device ID (worker_id)"
          required
          value={formik.values.deviceWorkerId}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.deviceWorkerId}
          touched={formik.touched.deviceWorkerId}
        />
        {!loadingWorkers && unassignedWorkers.length === 0 ? (
          <p className="rounded-lg bg-warning-soft px-3.5 py-2.5 text-sm text-warning-soft-foreground">
            Every registered Worker already has a device assigned. Create a new Worker first.
          </p>
        ) : (
          <Select
            id="workerId"
            name="workerId"
            label="Assign to Worker"
            required
            placeholder={loadingWorkers ? "Loading workers..." : "Select a worker"}
            options={unassignedWorkers.map((worker) => ({ value: worker.id, label: `${worker.name} (${worker.workerCode})` }))}
            value={formik.values.workerId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.workerId}
            touched={formik.touched.workerId}
            disabled={loadingWorkers}
          />
        )}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/devices")}>
            Cancel
          </Button>
          <Button type="submit" loading={formik.isSubmitting} disabled={unassignedWorkers.length === 0}>
            Register Device
          </Button>
        </div>
      </form>
    </div>
  );
}
