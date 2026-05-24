import { useRef, useEffect } from 'react';

const STATUS_COLORS = {
  off_duty: '#3b82f6',
  sleeper:  '#a855f7',
  driving:  '#22c55e',
  on_duty:  '#ef4444',
};

const STATUS_ROWS   = ['off_duty', 'sleeper', 'driving', 'on_duty'];
const STATUS_LABELS = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty\n(Not Driving)'];

/* Canvas layout constants */
const ML  = 138;   // margin left
const MT  = 24;    // margin top
const GW  = 820;   // grid width
const GH  = 180;   // grid height
const RH  = 45;    // row height
const CW  = GW / 24;
const CVW = ML + GW + 28;
const CVH = MT + GH + 70;

const BG        = '#0a1628';
const COL_MAJOR = 'rgba(255,255,255,0.12)';
const COL_MINOR = 'rgba(255,255,255,0.05)';
const COL_ROW   = 'rgba(255,255,255,0.08)';
const COL_BORD  = 'rgba(255,255,255,0.2)';
const COL_TEXT  = '#94a3b8';
const COL_TOTAL = '#f1f5f9';

function drawGrid(ctx, entries) {
  /* ── background ── */
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CVW, CVH);

  /* ── zebra row fill ── */
  STATUS_ROWS.forEach((_, i) => {
    ctx.fillStyle = i % 2 === 0
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(0,0,0,0.15)';
    ctx.fillRect(ML, MT + i * RH, GW, RH);
  });

  /* ── vertical hour lines ── */
  for (let h = 0; h <= 24; h++) {
    const x = ML + h * CW;
    const isMajor = h % 6 === 0;
    const isEven  = h % 2 === 0;
    ctx.strokeStyle = isMajor ? COL_MAJOR : isEven ? COL_MINOR : 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = isMajor ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, MT);
    ctx.lineTo(x, MT + GH);
    ctx.stroke();
  }

  /* ── horizontal row lines ── */
  for (let r = 0; r <= STATUS_ROWS.length; r++) {
    const y = MT + r * RH;
    const isBorder = r === 0 || r === STATUS_ROWS.length;
    ctx.strokeStyle = isBorder ? COL_BORD : COL_ROW;
    ctx.lineWidth   = isBorder ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(ML, y);
    ctx.lineTo(ML + GW, y);
    ctx.stroke();
  }

  /* ── outer border ── */
  ctx.strokeStyle = COL_BORD;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(ML, MT, GW, GH);

  /* ── hour labels ── */
  const HOUR_LABELS = [
    'Mid',1,2,3,4,5,6,7,8,9,10,11,'Noon',
    13,14,15,16,17,18,19,20,21,22,23,'Mid',
  ];
  ctx.fillStyle  = COL_TEXT;
  ctx.font       = 'bold 9px "JetBrains Mono", monospace';
  ctx.textAlign  = 'center';
  HOUR_LABELS.forEach((label, h) => {
    ctx.fillText(String(label), ML + h * CW, MT - 7);
  });

  /* ── row labels ── */
  ctx.textAlign = 'right';
  ctx.font      = '10px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = COL_TEXT;
  STATUS_LABELS.forEach((label, i) => {
    const cy = MT + i * RH + RH / 2;
    const lines = label.split('\n');
    if (lines.length === 1) {
      ctx.fillText(label, ML - 8, cy + 4);
    } else {
      ctx.fillText(lines[0], ML - 8, cy - 3);
      ctx.fillText(lines[1], ML - 8, cy + 9);
    }
  });

  /* ── duty status lines (glowing) ── */
  const statusIndex = { off_duty: 0, sleeper: 1, driving: 2, on_duty: 3 };

  entries.forEach(entry => {
    const rowIdx = statusIndex[entry.status];
    if (rowIdx === undefined) return;

    const color  = STATUS_COLORS[entry.status];
    const cy     = MT + rowIdx * RH + RH / 2;
    const startX = ML + entry.start_hour * CW;
    const endX   = ML + entry.end_hour   * CW;

    /* glow pass */
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 6;

    /* horizontal line */
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, cy);
    ctx.lineTo(endX,   cy);
    ctx.stroke();

    /* vertical connectors */
    ctx.lineWidth = 1.5;
    ctx.lineCap   = 'butt';

    ctx.beginPath();
    ctx.moveTo(startX, MT + rowIdx * RH);
    ctx.lineTo(startX, MT + (rowIdx + 1) * RH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, MT + rowIdx * RH);
    ctx.lineTo(endX, MT + (rowIdx + 1) * RH);
    ctx.stroke();

    ctx.restore();
  });

  /* ── totals per row ── */
  const totals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 };
  entries.forEach(e => { totals[e.status] = (totals[e.status] || 0) + e.duration_hrs; });

  ctx.textAlign  = 'left';
  ctx.font       = 'bold 10px "JetBrains Mono", monospace';
  ctx.shadowBlur = 0;
  STATUS_ROWS.forEach((status, i) => {
    const cy = MT + i * RH + RH / 2 + 4;
    ctx.fillStyle = STATUS_COLORS[status];
    ctx.fillText(`${(totals[status] || 0).toFixed(2)}h`, ML + GW + 6, cy);
  });

  /* ── grand total ── */
  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
  ctx.font      = 'bold 9px "JetBrains Mono", monospace';
  ctx.fillStyle = COL_TOTAL;
  ctx.fillText(`= ${totalAll.toFixed(2)}h`, ML + GW + 6, MT + GH + 16);
}

/* ── Canvas component ── */
function ELDCanvas({ log }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !log) return;
    const ctx = canvas.getContext('2d');

    const clamped = log.entries
      .map(e => {
        let s = e.start_hour, en = e.end_hour;
        if (en === 0 || en < s) en = 24;
        return { ...e, start_hour: Math.max(0, Math.min(24, s)), end_hour: Math.max(0, Math.min(24, en)) };
      })
      .filter(e => e.end_hour > e.start_hour);

    drawGrid(ctx, clamped);
  }, [log]);

  return (
    <canvas
      ref={canvasRef}
      width={CVW}
      height={CVH}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
}

/* ── Main export ── */
export default function ELDLogSheet({ dailyLogs }) {
  if (!dailyLogs?.length) return null;

  return (
    <div className="eld-section">
      <div className="section-label">FMCSA Compliance</div>
      <h3 className="section-title">Driver's Daily Log Sheets</h3>
      <p className="eld-subtitle">Generated per FMCSA regulations — 70hr/8-day property carrier</p>

      {dailyLogs.map((log, idx) => {
        const dateStr = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        /* deduplicated remarks */
        const remarks = log.entries
          .filter(e => e.location)
          .reduce((acc, e) => {
            const last = acc[acc.length - 1];
            if (!last || last.location !== e.location) acc.push(e);
            return acc;
          }, []);

        return (
          <div key={idx} className="log-sheet">

            {/* ── Header ── */}
            <div className="log-sheet-header">
              <div>
                <div className="log-doc-title">Driver's Daily Log</div>
                <div className="log-dept">U.S. Dept. of Transportation · FMCSA</div>
              </div>
              <div className="log-date-center">{dateStr}</div>
              <div className="log-meta-right">
                <div className="log-miles">
                  Total Miles: <strong>{log.total_miles}</strong>
                </div>
              </div>
            </div>

            {/* ── Dark Canvas ── */}
            <div className="canvas-wrapper">
              <ELDCanvas log={log} />
            </div>

            {/* ── Footer: legend ── */}
            <div className="log-footer">
              <div className="status-legend">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="legend-item">
                    <span className="legend-dot" style={{ background: color }} />
                    <span>{status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <strong>{(log.totals?.[status] || 0).toFixed(2)}h</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Remarks ── */}
            <div className="remarks-section">
              <strong>Remarks</strong>
              <div className="remarks-entries">
                {remarks.map((e, i) => (
                  <div key={i} className="remark-chip">
                    <span className="rchip-time">
                      {new Date(e.start_time).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {e.location}
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
