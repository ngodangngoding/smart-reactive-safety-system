"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { TriangleAlert } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import TextInput from "@/components/atoms/TextInput.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../../AuthContext.js";
import { deleteAccount } from "@/services/authService.js";
import { apiErrorMessage } from "@/lib/apiError.js";

export default function SettingsDeleteAccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const start = () => {
    if (!password) {
      setPasswordError("Enter your password to continue");
      return;
    }
    setPasswordError(null);
    setOpen(true);
  };

  const confirm = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteAccount(password);
      toast.success(message);
      router.push("/login");
    } catch (error) {
      setOpen(false);
      const fields = error.response?.data?.data?.fields;
      if (fields?.password) setPasswordError(fields.password);
      else toast.error(apiErrorMessage(error));
      setDeleting(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold text-foreground">Delete Account</h2>

      <section className="max-w-lg space-y-4 rounded-lg border border-danger p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
            <TriangleAlert className="h-5 w-5 text-danger" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-foreground">Delete your account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You will be signed out everywhere and lose access immediately. Your email can be registered again later. Records you created (workers, devices, audit history) are kept.
            </p>
          </div>
        </div>

        <TextInput
          id="password"
          name="password"
          type="password"
          label="Confirm with your password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          touched
        />

        <div className="flex justify-end">
          <Button variant="danger" onClick={start}>
            Delete my account
          </Button>
        </div>
      </section>

      <DeleteConfirmationModal
        open={open}
        title="Delete your account?"
        description="This cannot be undone from the app."
        requireText={user.email}
        loading={deleting}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
