import Redis from "ioredis";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/errors";

const { keyPrefix } = config.redis;
const k = (key) => `${keyPrefix}${key}`;

function client() {
  if (!globalThis.__redis) {
    const instance = new Redis(config.redis.url, {
      password: config.redis.password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    instance.on("error", (error) => console.error("Redis error:", error.message));
    globalThis.__redis = instance;
  }
  return globalThis.__redis;
}

async function run(fn) {
  try {
    const c = client();
    if (c.status === "wait" || c.status === "end") await c.connect();
    return await fn(c);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Redis unavailable:", error.message);
    throw new ApiError("Service temporarily unavailable", 503, "SERVICE_UNAVAILABLE");
  }
}

export const redis = {
  get: (key) => run((c) => c.get(k(key))),
  setEx: (key, seconds, value) => run((c) => c.set(k(key), value, "EX", seconds)),
  setNxEx: async (key, seconds, value) => (await run((c) => c.set(k(key), value, "EX", seconds, "NX"))) === "OK",
  del: (...keys) => run((c) => c.del(...keys.map(k))),
  ttl: (key) => run((c) => c.ttl(k(key))),
  getDel: (key) => run((c) => c.eval("local v=redis.call('GET',KEYS[1]); if v then redis.call('DEL',KEYS[1]) end; return v", 1, k(key))),
  evalScript: (script, keys, args) => run((c) => c.eval(script, keys.length, ...keys.map(k), ...args)),
  multiSetEx: (entries) =>
    run((c) => {
      const m = c.multi();
      for (const [key, seconds, value] of entries) m.set(k(key), value, "EX", seconds);
      return m.exec();
    }),
};
