"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import TextInput from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import { changePassword } from "@/services/authService.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import { useAuth } from "../../AuthContext.js";

export default function SettingsSecurityPage() {
  const { user, updateUser } = useAuth();
  const hasPassword = user.hasPassword !== false;

  const Schema = Yup.object({
    ...(hasPassword ? { currentPassword: Yup.string().required("Current password is required") } : {}),
    newPassword: Yup.string().min(8, "At least 8 characters").required("New password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("newPassword")], "Passwords do not match")
      .required("Confirm the new password"),
  });

  const formik = useFormik({
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      try {
        const payload = hasPassword ? { currentPassword: values.currentPassword, newPassword: values.newPassword } : { newPassword: values.newPassword };
        const { message } = await changePassword(payload);
        updateUser({ hasPassword: true });
        toast.success(message);
        helpers.resetForm();
      } catch (error) {
        if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  const field = (name, label) => (
    <TextInput
      id={name}
      name={name}
      type="password"
      label={label}
      autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
      required
      value={formik.values[name]}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      error={formik.errors[name]}
      touched={formik.touched[name]}
    />
  );

  return (
    <>
      <h2 className="text-xl font-bold text-foreground">Security</h2>

      <form onSubmit={formik.handleSubmit} noValidate className="max-w-md space-y-4 rounded-lg border border-border p-6">
        <div>
          <h3 className="text-base font-bold text-foreground">{hasPassword ? "Change password" : "Set password"}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hasPassword
              ? "You stay signed in on this device. Other sessions keep working until they refresh."
              : "You signed in with Google and don't have a password yet. Set one to also sign in with your email."}
          </p>
        </div>
        {hasPassword && field("currentPassword", "Current password")}
        {field("newPassword", "New password")}
        {field("confirmPassword", "Confirm new password")}
        <div className="flex justify-end">
          <Button type="submit" loading={formik.isSubmitting}>
            {hasPassword ? "Change password" : "Set password"}
          </Button>
        </div>
      </form>
    </>
  );
}
