"use client";

import { useEffect, useState } from "react";
import DetailPageSkeleton from "@/components/organisms/DetailPageSkeleton.jsx";
import { useParams, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import TextInput from "@/components/atoms/TextInput.jsx";
import Select from "@/components/atoms/Select.jsx";
import Button from "@/components/atoms/Button.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../../AuthContext.js";
import { getUser, updateUser, deleteUser } from "@/services/userService.js";
import { getOrganizationOptions } from "@/services/organizationService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import ConfirmModal from "@/components/template/ConfirmModal.jsx";
import { logout } from "@/services/authService.js";
import { useSuperAdminTotal, deleteBlockedReason } from "@/lib/userDelete.js";

const Schema = Yup.object({
  name: Yup.string().trim().required("Name is required"),
  email: Yup.string().email("Enter a valid email address").required("Email is required"),
  role: Yup.string().oneOf(["SUPERADMIN", "ADMIN"]).required("Role is required"),
  organizationId: Yup.string().when("role", {
    is: "ADMIN",
    then: (schema) => schema.required("Organization is required for ADMIN"),
  }),
  password: Yup.string().min(8, "Password must be at least 8 characters").optional(),
});

export default function UserDetailPage() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const router = useRouter();

  const [account, setAccount] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(null);
  const superAdminTotal = useSuperAdminTotal(currentUser.role === "SUPERADMIN");

  useEffect(() => {
    if (currentUser.role !== "SUPERADMIN") return;
    Promise.all([getUser(id), getOrganizationOptions({ operationalOnly: true })])
      .then(([userData, orgs]) => {
        setAccount(userData);
        setOrganizations(orgs);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load user"))
      .finally(() => setLoading(false));
  }, [id, currentUser.role]);

  const revokesSessions = (values) =>
    Boolean(values.password) ||
    values.role !== account.role ||
    (values.role === "ADMIN" && values.organizationId !== (account.organizationId ?? "")) ||
    (account.isActive && !values.isActive);

  const save = async (values, helpers) => {
    try {
      const payload = { ...values };
      if (!payload.password) delete payload.password;
      const { data: updated, message } = await updateUser(id, payload);
      toast.success(message);
      if (id === currentUser.id && revokesSessions(values)) {
        logout();
        router.push("/login");
        return;
      }
      setAccount(updated);
      helpers.setFieldValue("password", "");
    } catch (error) {
      if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: account?.name ?? "",
      email: account?.email ?? "",
      isActive: account?.isActive ?? true,
      role: account?.role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN",
      organizationId: account?.organizationId ?? "",
      password: "",
    },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      if (revokesSessions(values)) {
        helpers.setSubmitting(false);
        setPending(values);
        return;
      }
      await save(values, helpers);
    },
  });
  useDirtyGuard(formik.dirty);

  if (currentUser.role !== "SUPERADMIN") {
    return <AccessDenied message="User management is available to Super Admins only." />;
  }

  if (loading) {
    return (
      <DetailPageSkeleton fields={5} />
    );
  }

  if (error) {
    return <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-danger">{error}</p>;
  }

  const deleteReason = deleteBlockedReason(account, currentUser.id, superAdminTotal);
  const currentOrganizationMissing = Boolean(account.organizationId) && !organizations.some((org) => org.id === account.organizationId);
  const organizationOptions = currentOrganizationMissing
    ? [...organizations, { id: account.organizationId, name: `${account.organization?.name ?? "Organisasi"} (tidak aktif)` }]
    : organizations.map((org) => org);
  const selfEdit = id === currentUser.id;

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{account.name}</h1>
          <p className="text-sm text-muted-foreground">{account.email}</p>
        </div>
        <IconButton
          icon={Trash2}
          label={deleteReason ?? "Delete user"}
          onClick={() => setDeleteOpen(true)}
          disabled={Boolean(deleteReason)}
          className="hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground"
        />
      </div>

      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-6">
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
        <TextInput
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.email}
          touched={formik.touched.email}
        />
        <Select
          id="role"
          name="role"
          label="Role"
          required
          options={[
            { value: "ADMIN", label: "Admin" },
            { value: "SUPERADMIN", label: "Super Admin" },
          ]}
          value={formik.values.role}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.role}
          touched={formik.touched.role}
        />
        {formik.values.role === "ADMIN" && (
          <Select
            id="organizationId"
            name="organizationId"
            label="Organization"
            required
            placeholder="Select an organization"
            options={organizationOptions.map((org) => ({ value: org.id, label: org.name }))}
            value={formik.values.organizationId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.organizationId}
            touched={formik.touched.organizationId}
          />
        )}
        {formik.values.role === "ADMIN" && currentOrganizationMissing && formik.values.organizationId === account.organizationId && (
          <p className="-mt-2 text-xs text-warning-soft-foreground">
            Organisasi ini tidak aktif atau license-nya bermasalah, jadi ADMIN di sini tidak bisa login. Pilih organisasi lain.
          </p>
        )}
        <TextInput
          id="password"
          name="password"
          type="password"
          label="New Password"
          autoComplete="new-password"
          placeholder="Leave blank to keep current password"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.password}
          touched={formik.touched.password}
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
          <Button type="button" variant="secondary" onClick={() => router.push("/users")}>
            Back
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={Boolean(pending)}
        title="Simpan perubahan?"
        description={
          selfEdit
            ? "Kamu akan keluar dari sesi ini sendiri setelah perubahan disimpan. Lanjutkan?"
            : `Perubahan ini akan mengeluarkan ${account.name} dari semua sesi aktifnya. Mereka harus login ulang. Lanjutkan?`
        }
        loading={formik.isSubmitting}
        onConfirm={async () => {
          const values = pending;
          setPending(null);
          formik.setSubmitting(true);
          await save(values, formik);
        }}
        onClose={() => setPending(null)}
      />

      <DeleteConfirmationModal
        open={deleteOpen}
        title="Delete this user?"
        description={`"${account.name}" will be soft-deleted and immediately lose access.`}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { message } = await deleteUser(id);
            toast.success(message);
            router.push("/users");
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
