const int = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = process.env;

export const config = {
  jwtSecret: env.JWT_SECRET,
  accessTtl: int(env.ACCESS_TOKEN_TTL_SECONDS, 900),
  refreshTtl: int(env.REFRESH_TOKEN_TTL_SECONDS, 2592000),

  google: {
    clientId: env.GOOGLE_CLIENT_ID || "",
  },

  redis: {
    url: env.REDIS_URL || `redis://${env.REDIS_HOST || "localhost"}:${env.REDIS_PORT || 6379}`,
    password: env.REDIS_PASSWORD || undefined,
    keyPrefix: env.REDIS_KEY_PREFIX || "app:",
  },

  businessTimeZone: env.BUSINESS_TIME_ZONE || "Asia/Jakarta",

  otp: {
    expirySeconds: int(env.OTP_EXPIRY_MINUTES, 15) * 60,
    resendCooldownSeconds: int(env.OTP_RESEND_COOLDOWN_SECONDS, 60),
    maxAttempts: int(env.OTP_MAX_ATTEMPTS, 5),
    resetTokenTtlSeconds: int(env.RESET_TOKEN_TTL_SECONDS, 900),
  },

  mail: {
    driver: env.MAIL_DRIVER || "log",
    host: env.SMTP_HOST,
    port: int(env.SMTP_PORT, 587),
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.MAIL_FROM || "App <no-reply@example.com>",
  },

  telemetryWebhook: {
    secret: env.TELEMETRY_WEBHOOK_SECRET,
    maxBatch: int(env.TELEMETRY_WEBHOOK_MAX_BATCH, 500),
    dedupeTtlSeconds: int(env.TELEMETRY_DEDUPE_TTL_SECONDS, 3600),
  },
};
