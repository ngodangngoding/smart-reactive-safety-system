const W = 600;
const MAX_POINTS = 1500;

function thin(points) {
  if (points.length <= MAX_POINTS) return points;
  const stride = Math.ceil(points.length / MAX_POINTS);
  return points.filter((_, i) => i % stride === 0 || i === points.length - 1);
}

function autoDomain(series) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (p.v < min) min = p.v;
      if (p.v > max) max = p.v;
    }
  }
  if (!Number.isFinite(min)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

function fmt(value, decimals) {
  return Number(value.toFixed(decimals)).toString();
}

export default function LineChart({ series, xDomain, xLabels, yDomain, height = 150, area = false, decimals = 1, legend, ariaLabel }) {
  const [x0, x1] = xDomain;
  const [ymin, ymax] = yDomain ?? autoDomain(series);
  const span = ymax - ymin || 1;
  const yLabels = [ymax, ymin + (span * 2) / 3, ymin + span / 3, ymin];

  const toX = (t) => ((t - x0) / (x1 - x0 || 1)) * W;
  const toY = (v) => 149 - ((v - ymin) / span) * 148;

  const items = legend ?? series.map((s) => ({ label: s.label, color: s.color }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <div
          className="flex min-w-[34px] flex-col justify-between text-right text-[11px] tabular-nums text-muted-foreground"
          style={{ height }}
          aria-hidden="true"
        >
          {yLabels.map((v, i) => (
            <span key={i} className="leading-none">
              {fmt(v, decimals)}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <svg viewBox={`0 0 ${W} 150`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label={ariaLabel}>
            {[1, 50, 100, 149].map((y) => (
              <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) => {
              const pts = thin(s.points).map((p) => `${toX(p.t).toFixed(1)},${toY(p.v).toFixed(1)}`);
              if (pts.length < 2) return null;
              return (
                <g key={s.key}>
                  {area && (
                    <polygon
                      points={`${pts.join(" ")} ${pts[pts.length - 1].split(",")[0]},149 ${pts[0].split(",")[0]},149`}
                      fill={s.color}
                      fillOpacity="0.08"
                    />
                  )}
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
          <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground" aria-hidden="true">
            {xLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <ul className="flex justify-center gap-4 text-xs text-text-secondary">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
