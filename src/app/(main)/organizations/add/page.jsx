"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import TextInput from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import Select from "@/components/atoms/Select.jsx";
import { getLicenseOptions } from "@/services/licenseService.js";
import { useAuth } from "../../AuthContext.js";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import { createOrganization } from "@/services/organizationService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";

const Schema = Yup.object({
  name: Yup.string().trim().required("Organization name is required"),
});

export default function AddOrganizationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [licenses, setLicenses] = useState([]);

  useEffect(() => {
    if (user.role !== "SUPERADMIN") return;
    getLicenseOptions()
      .then(setLicenses)
      .catch((err) => toast.error(apiErrorMessage(err)));
  }, [user.role]);


  const formik = useFormik({
    initialValues: { name: "", licenseId: "" },
    validationSchema: Schema,
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { message } = await createOrganization({ ...values, licenseId: values.licenseId });
        toast.success(message);
        router.push("/organizations");
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

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-lg font-semibold text-foreground">New Organization</h1>
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-6">
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
          placeholder="No license"
          options={licenses.map((license) => ({ value: license.id, label: license.name }))}
          value={formik.values.licenseId}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/organizations")}>
            Cancel
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Create Organization
          </Button>
        </div>
      </form>
    </div>
  );
}
