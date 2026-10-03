"use client";

import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import TextInput from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import { useAuth } from "../../AuthContext.js";
import { createLicense } from "@/services/licenseService.js";
import { useDirtyGuard } from "@/lib/useDirtyGuard.js";
import { apiErrorMessage, applyFieldErrors } from "@/lib/apiError.js";
import { dateBounds, validateLicenseDates } from "@/lib/licenseForm.js";

const count = Yup.number().typeError("Enter a number").integer("Whole numbers only").min(1, "Must be 1 or more").required("Required");

const Schema = Yup.object({
  name: Yup.string().trim().required("License name is required"),
  maxDevice: count,
});

export default function AddLicensePage() {
  const { user } = useAuth();
  const router = useRouter();

  const formik = useFormik({
    initialValues: { name: "", maxDevice: "", startDate: "", endDate: "" },
    validationSchema: Schema,
    validate: (values) => validateLicenseDates(values),
    onSubmit: async (values, helpers) => {
      const { setSubmitting } = helpers;
      try {
        const { message } = await createLicense({
          name: values.name.trim(),
          maxDevice: Number(values.maxDevice),
          startDate: values.startDate,
          endDate: values.endDate,
        });
        toast.success(message);
        router.push("/licenses");
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

  const { startMin, endMin } = dateBounds(formik.values);
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
      <h1 className="text-lg font-semibold text-foreground">New License</h1>
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-6">
        {field("name", "License Name")}
        {field("maxDevice", "Max Devices", "number")}
        {field("startDate", "Start Date", "date", { min: startMin })}
        {field("endDate", "End Date", "date", { min: endMin })}
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => router.push("/licenses")}>
            Cancel
          </Button>
          <Button type="submit" loading={formik.isSubmitting}>
            Create License
          </Button>
        </div>
      </form>
    </div>
  );
}
