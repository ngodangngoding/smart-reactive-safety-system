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
import IconButton from "@/components/atoms/IconButton.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth, useSetBreadcrumbLabel } from "../../AuthContext.js";
import { getLicense, updateLicense, deleteLicense } from "@/services/licenseService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import { dateBounds, validateLicenseDates } from "@/lib/licenseForm.js";
import { getLicenseDeletePreview } from "@/services/licenseService.js";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";

const count = Yup.number().typeError("Enter a number").integer("Whole numbers only").min(1, "Must be 1 or more").required("Required");

const Schema = Yup.object({
  name: Yup.string().trim().required("License name is required"),
  maxDevice: count,
});

export default function LicenseDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const router = useRouter();
  const setBreadcrumbLabel = useSetBreadcrumbLabel();

  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { preview: deletePreview, loading: previewLoading } = useDeletePreview(deleteOpen ? id : null, getLicenseDeletePreview);

  useEffect(() => {
    if (user.role !== "SUPERADMIN") return;
    getLicense(id)
      .then(setLicense)
      .catch((err) => setError(err.response?.data?.message || "Failed to load license"))
      .finally(() => setLoading(false));
  }, [id, user.role]);

  const licenseName = license?.name;
  useEffect(() => {
    setBreadcrumbLabel(licenseName);
  }, [licenseName, setBreadcrumbLabel]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { name: license?.name ?? "", maxDevice: license?.maxDevice ?? "", startDate: license?.startDate ?? "", endDate: license?.endDate ?? "" },
    validationSchema: Schema,
    validate: (values) => validateLicenseDates(values, license && { startDate: license.startDate, endDate: license.endDate }),
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { data: updated, message } = await updateLicense(id, {
          name: values.name.trim(),
          maxDevice: Number(values.maxDevice),
          startDate: values.startDate,
          endDate: values.endDate,
        });
        setLicense(updated);
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
    return <AccessDenied message="License management is available to Super Admins only." />;
  }

  if (loading) {
    return (
      <DetailPageSkeleton fields={4} />
    );
  }

  if (error) {
    return <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-danger">{error}</p>;
  }

  const { startMin, endMin } = dateBounds(formik.values, { startDate: license.startDate, endDate: license.endDate });
  const field = (name, label, type = "text", extra = {}) => (
    <TextInput
      id={name}
      name={name}
      type={type}
      label={label}
      required
      value={formik.values[name]}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      error={formik.errors[name]}
      touched={formik.touched[name]}
      {...extra}
    />
  );

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{license.name}</h1>
        <IconButton icon={Trash2} danger label="Delete license" onClick={() => setDeleteOpen(true)} />
      </div>

      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-6">
        {field("name", "License Name")}
        {field("maxDevice", "Max Devices", "number")}
        {field("startDate", "Start Date", "date", { min: startMin })}
        {field("endDate", "End Date", "date", { min: endMin })}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/licenses")}>
            Back
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>

      <DeleteConfirmationModal
        open={deleteOpen}
        title="Delete this license?"
        description={`"${license.name}" will be soft-deleted. It can only be deleted when no organization uses it.`}
        details={deletePreview && !deletePreview.canDelete ? `Still used by: ${deletePreview.organizationsUsing.map((org) => org.name).join(", ")}. Reassign them first.` : null}
        detailsLoading={previewLoading}
        requireText={license.name}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { message } = await deleteLicense(id);
            toast.success(message);
            router.push("/licenses");
          } catch (error) {
            toast.error(apiErrorMessage(error));
            setDeleting(false);
            setDeleteOpen(false);
          }
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
