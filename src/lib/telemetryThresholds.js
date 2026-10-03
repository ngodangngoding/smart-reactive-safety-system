
export const OFFLINE_AFTER_MINUTES = 5;
export const LOW_BATTERY_PERCENT = 20;

export const THRESHOLDS = {
  batteryVoltage: {
    label: "Battery Voltage",
    unit: "V",
    min: 0,
    max: 5,
    decimals: 1,
    zones: [
      { from: 0, to: 3.3, level: "danger" },
      { from: 3.3, to: 3.7, level: "warning" },
      { from: 3.7, to: 5, level: "safe" },
    ],
  },
  batteryPercent: {
    label: "Battery Level",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    zones: [
      { from: 0, to: LOW_BATTERY_PERCENT, level: "danger" },
      { from: LOW_BATTERY_PERCENT, to: 40, level: "warning" },
      { from: 40, to: 100, level: "safe" },
    ],
  },
  temperature: {
    label: "Temperature",
    unit: "°C",
    min: 0,
    max: 100,
    decimals: 1,
    zones: [
      { from: 0, to: 10, level: "warning" },
      { from: 10, to: 35, level: "safe" },
      { from: 35, to: 45, level: "warning" },
      { from: 45, to: 100, level: "danger" },
    ],
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    min: 0,
    max: 100,
    decimals: 0,
    zones: [
      { from: 0, to: 20, level: "warning" },
      { from: 20, to: 60, level: "safe" },
      { from: 60, to: 80, level: "warning" },
      { from: 80, to: 100, level: "danger" },
    ],
  },
  pressure: {
    label: "Pressure",
    unit: "hPa",
    min: 900,
    max: 1100,
    decimals: 0,
    zones: [
      { from: 900, to: 950, level: "danger" },
      { from: 950, to: 990, level: "warning" },
      { from: 990, to: 1040, level: "safe" },
      { from: 1040, to: 1070, level: "warning" },
      { from: 1070, to: 1100, level: "danger" },
    ],
  },
  altitude: {
    label: "Altitude",
    unit: "m",
    min: -100,
    max: 1000,
    decimals: 0,
    zones: [
      { from: -100, to: 0, level: "warning" },
      { from: 0, to: 780, level: "safe" },
      { from: 780, to: 1000, level: "warning" },
    ],
  },
};

export function levelFor(metric, value) {
  const { zones } = THRESHOLDS[metric];
  if (value < zones[0].from) return zones[0].level;
  const zone = zones.find((z) => value >= z.from && value < z.to);
  return (zone ?? zones[zones.length - 1]).level;
}

export function isStale(receivedAt) {
  if (!receivedAt) return true;
  return (Date.now() - new Date(receivedAt).getTime()) / 60000 > OFFLINE_AFTER_MINUTES;
}
