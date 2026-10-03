"use client";

import { useEffect, useState } from "react";
import DetailPageSkeleton from "@/components/organisms/DetailPageSkeleton.jsx";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import TextInput from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import Select from "@/components/atoms/Select.jsx";
import { getLicenseOptions } from "@/services/licenseService.js";
import IconButton from "@/components/atoms/IconButton.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../../AuthContext.js";
import { getOrganization, updateOrganization, deleteOrganization, enterOrganization, getOrganizationDeletePreview } from "@/services/organizationService.js";
import OrganizationTabs from "@/components/template/OrganizationTabs.jsx";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";

const Schema = Yup.object({
  name: Yup.string().trim().required("Organization name is required"),
});

export default function OrganizationDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const router = useRouter();

  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [licenses, setLicenses] = useState([]);
  const [entering, setEntering] = useState(false);
  const { preview, loading: previewLoading } = useDeletePreview(deleteOpen ? id : null, getOrganizationDeletePreview);

  useEffect(() => {
    if (user.role !== "SUPERADMIN") return;
    getLicenseOptions({ excludeOrganizationId: id })
      .then(setLicenses)
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, [user.role, id]);


  useEffect(() => {
    if (user.role !== "SUPERADMIN") return;
    getOrganization(id)
      .then(setOrganization)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, user.role]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { name: organization?.name ?? "", isActive: organization?.isActive ?? true, licenseId: organization?.license?.id ?? "" },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { data: updated, message } = await updateOrganization(id, values);
        setOrganization(updated);
        toast.success(message);
      } catch (error) {
        if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
  });
  useDirtyGuard(formik.dirty);

  if (user.role !== "SUPERADMIN") {
    return <AccessDenied message="Organization management is available to Super Admins only." />;
  }

  if (loading) {
    return (
      <DetailPageSkeleton fields={3} stats className="max-w-3xl" />
    );
  }

  if (error) {
    return <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-danger">{error}</p>;
  }

  const enter = async () => {
    setEntering(true);
    try {
      await enterOrganization({ id: organization.id, name: organization.name });
      router.push("/dashboard");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setEntering(false);
    }
  };

  const cascade = formatCascade(preview);
  const deleteDetails = preview
    ? [cascade && `Will also be deleted: ${cascade}.`, preview.licenseWillBeDeleted && `License "${preview.licenseName}" will be deleted too.`].filter(Boolean).join(" ")
    : null;
  const usage = organization.deviceUsage;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">{organization.name}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={enter} loading={entering} disabled={!organization.isActive}>
            Enter as this organization
          </Button>
          <IconButton icon={Trash2} label="Delete organization" onClick={() => setDeleteOpen(true)} className="hover:text-danger" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-4">
        {[
          ["Devices", `${usage.used} / ${usage.max}`],
          ["Users", organization.counts.users],
          ["Workers", organization.counts.workers],
          ["Active incidents", organization.counts.activeIncidents],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={formik.handleSubmit} noValidate className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-6">
        <TextInput
          id="name"
          name="name"
          label="Organization Name"
          required
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.name}
          touched={formik.touched.name}
        />
        <Select
          id="licenseId"
          name="licenseId"
          label="License"
          placeholder="Select a license"
          options={licenses.map((license) => ({ value: license.id, label: `${license.name} (max ${license.maxDevice} devices)` }))}
          value={formik.values.licenseId}
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
          Active
        </label>
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/organizations")}>
            Back
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>

      <OrganizationTabs organizationId={id} />

      <DeleteConfirmationModal
        open={deleteOpen}
        title="Delete this organization?"
        description={`"${organization.name}" will be soft-deleted together with its users, workers, devices, telemetry, and incidents.`}
        details={deleteDetails}
        detailsLoading={previewLoading}
        requireText={organization.name}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { message } = await deleteOrganization(id);
            toast.success(message);
            router.push("/organizations");
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
