"use client";

import styles from "./OperationalVisuals.module.css";

const number = (value, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits }).format(Number(value || 0));

export function PortfolioRing({ items, selectedKey, onSelect }) {
  const safeItems = (items || []).filter((item) => Number(item.value) > 0);
  const total = safeItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let offset = 0;
  const segments = safeItems.map((item) => {
    const percentage = total > 0 ? (Number(item.value) / total) * 100 : 0;
    const segment = { ...item, percentage, offset };
    offset += percentage;
    return segment;
  });
  const selected = segments.find((item) => item.key === selectedKey) || segments[0];

  return (
    <div className={styles.ringLayout}>
      <div className={styles.ringShell} role="img" aria-label="Interactive cellar composition chart">
        <svg viewBox="0 0 120 120" className={styles.ringSvg}>
          <circle className={styles.ringTrack} cx="60" cy="60" r="45" pathLength="100" />
          {segments.map((item) => {
            const active = item.key === selected?.key;
            return (
              <circle
                key={item.key}
                cx="60"
                cy="60"
                r="45"
                pathLength="100"
                fill="none"
                stroke={item.color}
                strokeWidth={active ? 19 : 15}
                strokeDasharray={`${Math.max(item.percentage - 0.28, 0.1)} ${100 - Math.max(item.percentage - 0.28, 0.1)}`}
                strokeDashoffset={-item.offset}
                className={`${styles.ringSegment} ${active ? styles.ringSegmentActive : styles.ringSegmentMuted}`}
                onClick={() => onSelect?.(item.key)}
              />
            );
          })}
        </svg>
        <div className={styles.ringCenter} key={selected?.key || "empty"}>
          <span>{selected?.label || "Cellar"}</span>
          <strong>{selected ? `${selected.percentage.toFixed(1)}%` : "0%"}</strong>
          <small>{selected ? `${number(selected.value, 2)} bottles` : "No stock"}</small>
        </div>
      </div>

      <div className={styles.ringLegend} aria-label="Select a wine category">
        {segments.slice(0, 8).map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => onSelect?.(item.key)}
            className={item.key === selected?.key ? styles.legendActive : ""}
          >
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <strong>{item.percentage.toFixed(1)}%</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReadinessFunnel({ steps }) {
  const safeSteps = steps || [];
  const maximum = Math.max(1, Number(safeSteps[0]?.value || 0));

  return (
    <div className={styles.funnel} aria-label="Guest wine readiness funnel">
      {safeSteps.map((step, index) => {
        const percentage = Math.max(5, Math.min(100, (Number(step.value || 0) / maximum) * 100));
        return (
          <div className={styles.funnelStep} key={step.label}>
            <div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.label}</strong>
              <em>{number(step.value, 0)}</em>
            </div>
            <div className={styles.funnelTrack}><i style={{ width: `${percentage}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function StockHeatmap({ rows, columns, onSelect }) {
  const values = (rows || []).flatMap((row) => columns.map((column) => Number(row.values?.[column.key] || 0)));
  const maximum = Math.max(1, ...values);

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmap} style={{ "--heatmap-columns": columns.length }} role="table" aria-label="Available stock by location and wine family">
        <div className={styles.heatmapCorner} role="columnheader">Location</div>
        {columns.map((column) => <div key={column.key} className={styles.heatmapColumn} role="columnheader">{column.label}</div>)}
        {(rows || []).map((row) => (
          <div className={styles.heatmapRow} key={row.key} role="row">
            <button type="button" className={styles.heatmapLabel} onClick={() => onSelect?.(row.key, "all")}>{row.label}</button>
            {columns.map((column) => {
              const value = Number(row.values?.[column.key] || 0);
              const intensity = value > 0 ? 0.14 + (value / maximum) * 0.76 : 0.035;
              return (
                <button
                  type="button"
                  key={column.key}
                  className={styles.heatmapCell}
                  style={{ "--cell-intensity": intensity }}
                  title={`${row.label} · ${column.label}: ${number(value, 2)} bottles`}
                  aria-label={`${row.label}, ${column.label}, ${number(value, 2)} bottles`}
                  onClick={() => onSelect?.(row.key, column.key)}
                >
                  {value > 0 ? number(value, value < 10 ? 1 : 0) : "—"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.heatmapScale}><span>Lower stock</span><i /><i /><i /><i /><span>Higher stock</span></div>
    </div>
  );
}

export function MovementFlow({ flows }) {
  const maximum = Math.max(1, ...(flows || []).map((flow) => Number(flow.quantity || 0)));

  return (
    <div className={styles.flowList} aria-label="Most active wine transfer routes">
      {(flows || []).map((flow, index) => (
        <div className={styles.flowRow} key={flow.key}>
          <span className={styles.flowRank}>{String(index + 1).padStart(2, "0")}</span>
          <strong>{flow.from}</strong>
          <div className={styles.flowLane}>
            <i style={{ width: `${Math.max(12, (Number(flow.quantity || 0) / maximum) * 100)}%` }} />
            <span>→</span>
          </div>
          <strong>{flow.to}</strong>
          <em>{number(flow.quantity, 2)} btl</em>
        </div>
      ))}
    </div>
  );
}
