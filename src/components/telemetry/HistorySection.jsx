"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/apiError.js";
import toast from "react-hot-toast";
import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import Badge from "@/components/atoms/Badge.jsx";
import LineChart from "./LineChart.jsx";
import GpsMapLazy, { GpsFooter } from "./GpsMapLazy.jsx";
import WidgetCard, { DateButton, LiveBadge, RefreshButton, WidgetEmpty, WidgetSkeleton } from "./WidgetCard.jsx";
import { getTelemetryRange } from "@/services/workerNodeService.js";
import { getIncidents } from "@/services/incidentService.js";

const todayKey = () => format(new Date(), "yyyy-MM-dd");
const DAY_LABELS = ["00:00", "06:00", "12:00", "18:00", "24:00"];
const RAW_ROW_CAP = 300;

function useDayCache(nodeId) {
  const [days, setDays] = useState({});
  const requested = useRef(new Set());

  const load = useCallback(
    async (day) => {
      setDays((prev) => ({ ...prev, [day]: { ...prev[day], status: "loading" } }));
      try {
        const from = startOfDay(parseISO(day));
        const rows = await getTelemetryRange(nodeId, from, addDays(from, 1));
        setDays((prev) => ({ ...prev, [day]: { status: "ready", rows } }));
      } catch (error) {
        const message = apiErrorMessage(error);
        toast.error(message);
        setDays((prev) => ({ ...prev, [day]: { status: "error", message } }));
      }
    },
    [nodeId]
  );

  const ensure = useCallback(
    (day) => {
      if (requested.current.has(day)) return;
      requested.current.add(day);
      load(day);
    },
    [load]
  );

  return { days, ensure, refresh: load };
}

function HistoryWidget({ title, unit, height, className, cache, children }) {
  const [day, setDay] = useState(todayKey);
  const { ensure, refresh } = cache;

  useEffect(() => {
    ensure(day);
  }, [day, ensure]);

  const entry = cache.days[day];
  const loading = !entry || entry.status === "loading";

  return (
    <WidgetCard
      title={title}
      unit={unit}
      height={height}
      className={className}
      controls={
        <>
          <RefreshButton loading={loading} onClick={() => refresh(day)} />
          <DateButton day={day} onChange={setDay} />
          {isSameDay(parseISO(day), new Date()) && <LiveBadge />}
        </>
      }
    >
      {loading && !entry?.rows ? (
        <WidgetSkeleton />
      ) : entry.status === "error" ? (
        <WidgetEmpty>{entry.message}</WidgetEmpty>
      ) : entry.rows.length === 0 ? (
        <WidgetEmpty />
      ) : (
        children(entry.rows, day)
      )}
    </WidgetCard>
  );
}

function ChartBody({ rows, day, metric, label, color = "var(--primary)", decimals = 1, yDomain }) {
  const series = useMemo(
    () => [
      {
        key: metric,
        label,
        color,
        points: rows.map((r) => ({ t: new Date(r.receivedAt).getTime(), v: Number(r[metric]) })).filter((p) => Number.isFinite(p.v)),
      },
    ],
    [rows, metric, label, color]
  );
  const t0 = startOfDay(parseISO(day)).getTime();
  return (
    <div className="p-4">
      <LineChart
        series={series}
        xDomain={[t0, t0 + 86400000]}
        xLabels={DAY_LABELS}
        yDomain={yDomain}
        height={140}
        area
        decimals={decimals}
        ariaLabel={`${label} history`}
      />
    </div>
  );
}

function TableWrap({ children }) {
  return <div className="min-h-0 flex-1 overflow-auto">{children}</div>;
}

const HEAD = "sticky top-0 bg-surface-subtle px-4 py-2 text-left text-xs font-medium text-text-th";
const CELL = "border-b border-border-faint px-4 py-[9px] text-[13px]";

function rawPayload(r, deviceWorkerId) {
  return {
    sequence: r.sequence,
    accel_y: r.accelY,
    longitude: r.longitude,
    timestamp: r.deviceTimestamp,
    temperature: r.temperature,
    sos: r.sos,
    gyro_z: r.gyroZ,
    latitude: r.latitude,
    satellites: r.satellites,
    altitude: r.altitude,
    battery_percent: r.batteryPercent,
    humidity: r.humidity,
    worker_id: deviceWorkerId,
    gyro_x: r.gyroX,
    pressure: r.pressure,
    battery_voltage: r.batteryVoltage,
    accel_x: r.accelX,
    accel_z: r.accelZ,
    gyro_y: r.gyroY,
  };
}

function RawBody({ rows, deviceWorkerId }) {
  const newest = useMemo(() => rows.slice().reverse().slice(0, RAW_ROW_CAP), [rows]);
  return (
    <TableWrap>
      <table className="w-full table-fixed text-left">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD} w-[120px] sm:w-[170px]`}>Time</th>
            <th scope="col" className={HEAD}>Payload</th>
          </tr>
        </thead>
        <tbody>
          {newest.map((r) => {
            const json = JSON.stringify(rawPayload(r, deviceWorkerId));
            return (
              <tr key={r.id}>
                <td className={`${CELL} tabular-nums text-muted-foreground`}>{format(new Date(r.receivedAt), "MMM d, HH:mm:ss")}</td>
                <td className={`${CELL} truncate font-mono text-xs text-text-secondary`} title={json}>
                  {json}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > RAW_ROW_CAP && (
        <p className="px-4 py-2 text-[11px] text-muted-foreground">Showing the latest {RAW_ROW_CAP} of {rows.length} readings.</p>
      )}
    </TableWrap>
  );
}

function RouteBody({ rows }) {
  const route = useMemo(
    () => rows.filter((r) => r.latitude != null && r.longitude != null).map((r) => [Number(r.latitude), Number(r.longitude)]),
    [rows]
  );
  if (route.length === 0) return <WidgetEmpty>No location data available</WidgetEmpty>;
  const last = route[route.length - 1];
  return (
    <>
      <GpsMapLazy route={route} />
      <GpsFooter lat={last[0]} lng={last[1]} />
    </>
  );
}

function SosHistoryWidget({ workerId }) {
  const [day, setDay] = useState(todayKey);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIncidents((await getIncidents({ workerId, pageSize: 100 })).items);
      setError(null);
    } catch (err) {
      const message = apiErrorMessage(err);
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    const run = () => load();
    run();
  }, [load]);

  const events = useMemo(() => {
    const d = parseISO(day);
    const list = [];
    for (const i of incidents) {
      if (isSameDay(new Date(i.startedAt), d)) list.push({ id: `${i.id}-s`, at: new Date(i.startedAt), resolved: false });
      if (i.resolvedAt && isSameDay(new Date(i.resolvedAt), d)) list.push({ id: `${i.id}-r`, at: new Date(i.resolvedAt), resolved: true });
    }
    return list.sort((a, b) => b.at - a.at);
  }, [incidents, day]);

  return (
    <WidgetCard
      title="SOS History"
      height={290}
      controls={
        <>
          <RefreshButton loading={loading} onClick={load} />
          <DateButton day={day} onChange={setDay} />
          {isSameDay(parseISO(day), new Date()) && <LiveBadge />}
        </>
      }
    >
      {loading && incidents.length === 0 ? (
        <WidgetSkeleton />
      ) : error ? (
        <WidgetEmpty>{error}</WidgetEmpty>
      ) : events.length === 0 ? (
        <WidgetEmpty />
      ) : (
        <TableWrap>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th scope="col" className={HEAD}>Time</th>
                <th scope="col" className={HEAD}>SOS History</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className={`${CELL} tabular-nums text-muted-foreground`}>{format(e.at, "MMM d, HH:mm:ss")}</td>
                  <td className={CELL}>
                    <Badge variant={e.resolved ? "success" : "danger"} withDot>
                      {e.resolved ? "Resolved" : "SOS triggered"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </WidgetCard>
  );
}

export default function HistorySection({ nodeId, workerId, deviceWorkerId }) {
  const cache = useDayCache(nodeId);
  const charts = [
    { title: "Temperature", unit: "°C", metric: "temperature" },
    { title: "Humidity", unit: "%", metric: "humidity", decimals: 0 },
    { title: "Pressure", unit: "hPa", metric: "pressure", decimals: 0 },
    { title: "Altitude", unit: "m", metric: "altitude", decimals: 0 },
    { title: "Battery Level", unit: "%", metric: "batteryPercent", decimals: 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {charts.map((c) => (
        <HistoryWidget key={c.metric} title={c.title} unit={c.unit} height={290} cache={cache}>
          {(rows, day) => <ChartBody rows={rows} day={day} metric={c.metric} label={c.unit} decimals={c.decimals} />}
        </HistoryWidget>
      ))}

      <SosHistoryWidget workerId={workerId} />

      <HistoryWidget title="Raw Telemetry" height={360} className="lg:col-span-2" cache={cache}>
        {(rows) => <RawBody rows={rows} deviceWorkerId={deviceWorkerId} />}
      </HistoryWidget>

      <HistoryWidget title="GPS History" height={360} cache={cache}>
        {(rows) => <RouteBody rows={rows} />}
      </HistoryWidget>
    </div>
  );
}
