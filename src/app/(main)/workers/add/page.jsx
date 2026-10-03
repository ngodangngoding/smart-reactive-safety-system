"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import TextInput from "@/components/atoms/TextInput.jsx";
import Select from "@/components/atoms/Select.jsx";
import Button from "@/components/atoms/Button.jsx";
import { useAuth } from "../../AuthContext.js";
import { createWorker } from "@/services/workerService.js";
import { getOrganizationOptions } from "@/services/organizationService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";

const SuperadminSchema = Yup.object({
  workerCode: Yup.string().trim().required("Worker code is required"),
  name: Yup.string().trim().required("Name is required"),
  organizationId: Yup.string().required("Organization is required"),
});

const AdminSchema = Yup.object({
  workerCode: Yup.string().trim().required("Worker code is required"),
  name: Yup.string().trim().required("Name is required"),
});

export default function AddWorkerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSuperadmin = user.role === "SUPERADMIN";
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    if (isSuperadmin) getOrganizationOptions().then(setOrganizations).catch(() => {});
  }, [isSuperadmin]);

  const formik = useFormik({
    initialValues: { workerCode: "", name: "", organizationId: "" },
    validationSchema: isSuperadmin ? SuperadminSchema : AdminSchema,
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { message } = await createWorker(values);
        toast.success(message);
        router.push("/workers");
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
      <h1 className="text-lg font-semibold text-foreground">New Worker</h1>
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-6">
        <TextInput
          id="workerCode"
          name="workerCode"
          label="Worker Code"
          required
          value={formik.values.workerCode}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.workerCode}
          touched={formik.touched.workerCode}
        />
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
        {isSuperadmin && (
          <Select
            id="organizationId"
            name="organizationId"
            label="Organization"
            required
            placeholder="Select an organization"
            options={organizations.map((org) => ({ value: org.id, label: org.name }))}
            value={formik.values.organizationId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.organizationId}
            touched={formik.touched.organizationId}
          />
        )}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/workers")}>
            Cancel
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Create Worker
          </Button>
        </div>
      </form>
    </div>
  );
}
