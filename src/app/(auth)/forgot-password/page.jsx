"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import TextInput from "@/components/atoms/TextInput.jsx";
import Button from "@/components/atoms/Button.jsx";
import { forgotPassword, verifyOtp, resetPassword } from "@/services/authService.js";
import { apiErrorMessage } from "@/lib/apiError.js";

const STEP_TITLES = ["Forgot your password?", "Enter the code", "Choose a new password"];
const STEP_HINTS = [
  "Enter your account email and we will send you a 6-digit code.",
  "We sent a 6-digit code to your email. Enter it below to continue.",
  "Use at least 8 characters. You will be signed out on every device.",
];

function useCountdown() {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const start = (seconds) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  };
  return [Math.max(0, Math.ceil((endsAt - now) / 1000)), start];
}

const formatClock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [expiresIn, startExpiry] = useCountdown();
  const [resendIn, startResend] = useCountdown();

  const backToStart = (message) => {
    if (message) toast.error(message);
    setStep(0);
    setOtpCode("");
    setResetToken("");
    setRemainingAttempts(null);
    setErrors({});
  };

  const requestCode = async () => {
    const normalized = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setErrors({ email: "Enter a valid email address" });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const data = await forgotPassword(normalized);
      toast.success(data.message);
      startExpiry(data.expiresInSeconds);
      startResend(data.resendCooldownSeconds);
      setOtpCode("");
      setRemainingAttempts(null);
      setStep(1);
    } catch (error) {
      const body = error.response?.data;
      if (body?.data?.code === "OTP_COOLDOWN") {
        startResend(body.data.retryAfterSeconds);
        setStep(1);
      } else {
        toast.error(apiErrorMessage(error, "Could not send the code"));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setErrors({ otpCode: "Enter the 6-digit code" });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const data = await verifyOtp(email.trim(), otpCode);
      setResetToken(data.resetToken);
      setStep(2);
    } catch (error) {
      const body = error.response?.data?.data;
      if (body?.code === "OTP_INVALID") {
        setRemainingAttempts(body.remainingAttempts);
        setErrors({ otpCode: `Incorrect code. ${body.remainingAttempts} attempt(s) left.` });
      } else if (body?.code === "OTP_LOCKED" || body?.code === "OTP_EXPIRED") {
        backToStart(error.response.data.message);
      } else {
        toast.error(apiErrorMessage(error, "Could not verify the code"));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    const next = {};
    if (newPassword.length < 8) next.newPassword = "Password must be at least 8 characters";
    if (confirmPassword !== newPassword) next.confirmPassword = "Passwords do not match";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await resetPassword({ resetToken, newPassword, confirmPassword });
      toast.success("Password reset. Please sign in.");
      router.push("/login");
    } catch (error) {
      const body = error.response?.data?.data;
      if (body?.code === "RESET_TOKEN_INVALID") backToStart(error.response.data.message);
      else if (body?.fields) setErrors(body.fields);
      else toast.error(apiErrorMessage(error, "Could not reset the password"));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (step === 0) requestCode();
    else if (step === 1) submitCode();
    else submitPassword();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[420px] animate-fade-up rounded-2xl border border-border bg-card p-8 shadow-overlay">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
          <ShieldCheck className="h-[22px] w-[22px]" aria-hidden="true" />
        </span>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-secondary">Step {step + 1} of 3</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{STEP_TITLES[step]}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{STEP_HINTS[step]}</p>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          {step === 0 && (
            <TextInput
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email}
              touched
            />
          )}

          {step === 1 && (
            <>
              <TextInput
                id="otpCode"
                name="otpCode"
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                error={errors.otpCode}
                touched
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{expiresIn > 0 ? `Code expires in ${formatClock(expiresIn)}` : "The code may have expired"}</span>
                {remainingAttempts !== null && <span>{remainingAttempts} attempt(s) left</span>}
              </div>
              <Button type="button" variant="secondary" disabled={resendIn > 0 || busy} onClick={requestCode}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <TextInput
                id="newPassword"
                name="newPassword"
                type="password"
                label="New password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                error={errors.newPassword}
                touched
              />
              <TextInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm new password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                error={errors.confirmPassword}
                touched
              />
            </>
          )}

          <Button type="submit" className="w-full !h-[42px]" loading={busy}>
            {step === 0 ? "Send code" : step === 1 ? "Verify code" : "Reset password"}
          </Button>
        </form>

        <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
