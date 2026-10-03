"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import TextInput from "@/components/atoms/TextInput.jsx";
import Select from "@/components/atoms/Select.jsx";
import Button from "@/components/atoms/Button.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import { useAuth } from "../../AuthContext.js";
import { createUser } from "@/services/userService.js";
import { getOrganizationOptions } from "@/services/organizationService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";

const Schema = Yup.object({
  name: Yup.string().trim().required("Name is required"),
  email: Yup.string().email("Enter a valid email address").required("Email is required"),
  password: Yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  role: Yup.string().oneOf(["SUPERADMIN", "ADMIN"]).required("Role is required"),
  organizationId: Yup.string().when("role", {
    is: "ADMIN",
    then: (schema) => schema.required("Organization is required for ADMIN"),
  }),
});

export default function AddUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    getOrganizationOptions({ operationalOnly: true }).then(setOrganizations).catch(() => {});
  }, []);

  const formik = useFormik({
    initialValues: { name: "", email: "", password: "", role: "ADMIN", organizationId: "" },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { message } = await createUser(values);
        toast.success(message);
        router.push("/users");
      } catch (error) {
        if (!applyFieldErrors(error, helpers, values)) toast.error(apiErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
  });
  useDirtyGuard(formik.dirty);

  if (user.role !== "SUPERADMIN") {
    return <AccessDenied message="User management is available to Super Admins only." />;
  }

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-lg font-semibold text-foreground">New User</h1>
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
          autoComplete="off"
          required
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.email}
          touched={formik.touched.email}
        />
        <TextInput
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.password}
          touched={formik.touched.password}
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
            options={organizations.map((org) => ({ value: org.id, label: org.name }))}
            value={formik.values.organizationId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.organizationId}
            touched={formik.touched.organizationId}
          />
        )}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/users")}>
            Cancel
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Create User
          </Button>
        </div>
      </form>
    </div>
  );
}
