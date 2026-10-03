import Badge from "@/components/atoms/Badge.jsx";
import { THRESHOLDS, levelFor } from "@/lib/telemetryThresholds.js";

const ARC_LEN = 289.03;
const TRACK_LEN = 251.33;
const GAP = 1.5;

const LEVEL = {
  danger: { color: "var(--danger)", badge: "danger", label: "Danger" },
  warning: { color: "var(--warning)", badge: "warning", label: "Warning" },
  safe: { color: "var(--success)", badge: "success", label: "Safe" },
};

export default function Gauge({ metric, value }) {
  const cfg = THRESHOLDS[metric];
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const range = cfg.max - cfg.min;
  const f = hasValue ? Math.min(1, Math.max(0, (value - cfg.min) / range)) : 0;
  const level = hasValue ? LEVEL[levelFor(metric, value)] : null;
  const stroke = level?.color ?? "var(--border-strong)";

  const knobX = 100 + 80 * Math.cos(Math.PI * (1 - f));
  const knobY = 100 - 80 * Math.sin(Math.PI * (1 - f));
  const shown = hasValue ? value.toFixed(cfg.decimals) : "—";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3 py-2">
      <div className="relative aspect-[200/112] w-full max-w-[200px]">
        <svg
          viewBox="0 0 200 112"
          className="h-full w-full"
          role="img"
          aria-label={hasValue ? `${cfg.label} ${shown} ${cfg.unit}, ${level.label}` : `${cfg.label}: no data`}
        >
          {cfg.zones.map((zone, i) => {
            const start = ((zone.from - cfg.min) / range) * ARC_LEN;
            const len = ((zone.to - zone.from) / range) * ARC_LEN - (i < cfg.zones.length - 1 ? GAP : 0);
            return (
              <path
                key={i}
                d="M8 100 A92 92 0 0 1 192 100"
                fill="none"
                stroke={LEVEL[zone.level].color}
                strokeWidth="4"
                strokeDasharray={`${len} 1000`}
                strokeDashoffset={-start}
              />
            );
          })}
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--gauge-track)" strokeWidth="12" strokeLinecap="round" />
          {hasValue && (
            <>
              <path
                d="M20 100 A80 80 0 0 1 180 100"
                fill="none"
                stroke={stroke}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${TRACK_LEN * f} 1000`}
              />
              <circle cx={knobX} cy={knobY} r="7" fill="#fff" stroke={stroke} strokeWidth="3" />
            </>
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-[3px]">
          <span className="text-3xl font-bold leading-none tabular-nums text-foreground">{shown}</span>
          {hasValue && <span className="text-[13px] font-medium text-muted-foreground">{cfg.unit}</span>}
        </div>
      </div>

      <div className="flex w-full max-w-[216px] justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{cfg.min}</span>
        <span>{cfg.max}</span>
      </div>

      {level ? (
        <Badge variant={level.badge} withDot>
          {level.label}
        </Badge>
      ) : (
        <Badge variant="gray">No data</Badge>
      )}
    </div>
  );
}
