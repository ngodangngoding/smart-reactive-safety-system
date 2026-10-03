"use client";

import { useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { Camera, Loader2, Pencil, X } from "lucide-react";
import Avatar from "@/components/atoms/Avatar.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import Button from "@/components/atoms/Button.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import TextInput from "@/components/atoms/TextInput.jsx";
import { useAuth } from "../../AuthContext.js";
import { updateProfile, uploadAvatar, removeAvatar } from "@/services/authService.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const Schema = Yup.object({
  name: Yup.string().trim().required("Name is required"),
  email: Yup.string().trim().email("Enter a valid email address").required("Email is required"),
});

function EditButton({ onClick }) {
  return (
    <Button variant="secondary" onClick={onClick} className="!rounded-full">
      Edit
      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
    </Button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function SettingsProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG or WEBP images are allowed");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    setAvatarBusy(true);
    try {
      const { data: updated, message } = await uploadAvatar(file);
      updateUser(updated);
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    try {
      const { data: updated, message } = await removeAvatar();
      updateUser(updated);
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { name: user.name, email: user.email },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      try {
        const { data: updated, message } = await updateProfile({ name: values.name.trim(), email: values.email.trim() });
        updateUser(updated);
        toast.success(message);
        setEditing(false);
      } catch (error) {
        const body = error.response?.data?.data;
        if (body?.code === "DUPLICATE" && body.field === "email") helpers.setFieldError("email", "Email sudah dipakai akun lain");
        else if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  const cancel = () => {
    formik.resetForm();
    setEditing(false);
  };

  return (
    <>
      <h2 className="text-xl font-bold text-foreground">My Profile</h2>

      <section className="flex items-center gap-5 rounded-lg border border-border p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <div className="group relative shrink-0">
          <Avatar name={user.name} photoUrl={user.avatarUrl} size={72} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            aria-label="Change profile picture"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white disabled:cursor-not-allowed"
          >
            {avatarBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Camera className="h-5 w-5" aria-hidden="true" />}
          </button>
          {user.avatarUrl && !avatarBusy && (
            <IconButton
              icon={X}
              label="Remove profile picture"
              variant="bordered"
              danger
              onClick={handleRemoveAvatar}
              className="!absolute !-right-1 !-top-1 !h-6 !w-6 !bg-card"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">{user.name}</p>
          <p className="text-sm text-text-secondary">{user.role === "SUPERADMIN" ? "Super Admin" : "Admin"}</p>
          <p className="truncate text-sm text-muted-foreground">{user.organization?.name ?? "All organizations"}</p>
        </div>
        {!editing && (
          <div className="ml-auto">
            <EditButton onClick={() => setEditing(true)} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Personal information</h3>
          {!editing && <EditButton onClick={() => setEditing(true)} />}
        </div>

        {editing ? (
          <form onSubmit={formik.handleSubmit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
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
            <div className="flex justify-end gap-2.5 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" loading={formik.isSubmitting} disabled={!formik.dirty}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Name">{user.name}</Field>
            <Field label="Email address">{user.email}</Field>
            <Field label="Role">
              <Badge variant={user.role === "SUPERADMIN" ? "primary" : "gray"}>{user.role}</Badge>
            </Field>
            <Field label="Organization">{user.organization?.name ?? "All organizations"}</Field>
          </dl>
        )}
      </section>
    </>
  );
}
