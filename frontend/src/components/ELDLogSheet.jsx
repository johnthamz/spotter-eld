import { useRef, useEffect } from 'react';

const STATUS_COLORS = {
  off_duty: '#1d4ed8',
  sleeper: '#7c3aed',
  driving: '#16a34a',
  on_duty: '#dc2626',
};

const STATUS_ROWS = ['off_duty', 'sleeper', 'driving', 'on_duty'];
const STATUS_LABELS = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty\n(Not Driving)'];

// Grid dimensions
const MARGIN_LEFT = 130;
const MARGIN_TOP = 20;
const GRID_WIDTH = 820;
const GRID_HEIGHT = 180;
const ROW_HEIGHT = 45;
const HOURS = 24;
const CELL_W = GRID_WIDTH / HOURS;
const CANVAS_W = MARGIN_LEFT + GRID_WIDTH + 20;
const CANVAS_H = MARGIN_TOP + GRID_HEIGHT + 80;

function drawGrid(ctx, entries) {
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Outer border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.strokeRect(MARGIN_LEFT, MARGIN_TOP, GRID_WIDTH, GRID_HEIGHT);

  // Draw hour columns
  for (let h = 0; h <= HOURS; h++) {
    const x = MARGIN_LEFT + h * CELL_W;
    ctx.strokeStyle = h % 2 === 0 ? '#9ca3af' : '#d1d5db';
    ctx.lineWidth = h % 2 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, MARGIN_TOP);
    ctx.lineTo(x, MARGIN_TOP + GRID_HEIGHT);
    ctx.stroke();
  }

  // Draw row lines
  for (let r = 0; r <= STATUS_ROWS.length; r++) {
    const y = MARGIN_TOP + r * ROW_HEIGHT;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = r === 0 || r === STATUS_ROWS.length ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, y);
    ctx.lineTo(MARGIN_LEFT + GRID_WIDTH, y);
    ctx.stroke();
  }

  // Hour labels at top
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  const hourLabels = ['Mid', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 'Noon',
    13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 'Mid'];
  hourLabels.forEach((label, h) => {
    const x = MARGIN_LEFT + h * CELL_W;
    ctx.fillText(String(label), x, MARGIN_TOP - 4);
  });

  // Row labels
  ctx.textAlign = 'right';
  ctx.font = '11px Arial';
  STATUS_LABELS.forEach((label, i) => {
    const y = MARGIN_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const lines = label.split('\n');
    if (lines.length === 1) {
      ctx.fillText(label, MARGIN_LEFT - 6, y + 4);
    } else {
      ctx.fillText(lines[0], MARGIN_LEFT - 6, y - 2);
      ctx.fillText(lines[1], MARGIN_LEFT - 6, y + 10);
    }
  });

  // Draw duty status lines
  const statusIndex = { off_duty: 0, sleeper: 1, driving: 2, on_duty: 3 };

  entries.forEach(entry => {
    const rowIdx = statusIndex[entry.status];
    if (rowIdx === undefined) return;

    const y = MARGIN_TOP + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const startX = MARGIN_LEFT + entry.start_hour * CELL_W;
    const endX = MARGIN_LEFT + entry.end_hour * CELL_W;

    ctx.strokeStyle = STATUS_COLORS[entry.status];
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    // Vertical connectors to adjacent rows
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, MARGIN_TOP + rowIdx * ROW_HEIGHT);
    ctx.lineTo(startX, MARGIN_TOP + (rowIdx + 1) * ROW_HEIGHT);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, MARGIN_TOP + rowIdx * ROW_HEIGHT);
    ctx.lineTo(endX, MARGIN_TOP + (rowIdx + 1) * ROW_HEIGHT);
    ctx.stroke();
  });

  // Total hours per row
  const totals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 };
  entries.forEach(e => { totals[e.status] = (totals[e.status] || 0) + e.duration_hrs; });

  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  STATUS_ROWS.forEach((status, i) => {
    const y = MARGIN_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;
    const total = totals[status] || 0;
    ctx.fillText(`${total.toFixed(2)}h`, MARGIN_LEFT + GRID_WIDTH + 6, y);
  });

  // Total line
  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#374151';
  ctx.fillText(`= ${totalAll.toFixed(2)}h`, MARGIN_LEFT + GRID_WIDTH + 6,
    MARGIN_TOP + GRID_HEIGHT + 14);
}

function ELDCanvas({ log }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !log) return;
    const ctx = canvas.getContext('2d');

    // Handle midnight-crossing entries by clamping to 0-24
    const clampedEntries = log.entries.map(e => {
      let startH = e.start_hour;
      let endH = e.end_hour;
      if (endH === 0 || endH < startH) endH = 24;
      startH = Math.max(0, Math.min(24, startH));
      endH = Math.max(0, Math.min(24, endH));
      return { ...e, start_hour: startH, end_hour: endH };
    }).filter(e => e.end_hour > e.start_hour);

    drawGrid(ctx, clampedEntries);
  }, [log]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
}

export default function ELDLogSheet({ dailyLogs }) {
  if (!dailyLogs || dailyLogs.length === 0) return null;

  return (
    <div className="eld-section">
      <h3 className="section-title">📋 Driver's Daily Log Sheets</h3>
      <p className="eld-subtitle">
        Generated per FMCSA regulations — 70hr/8-day property carrier
      </p>

      {dailyLogs.map((log, idx) => {
        const date = new Date(log.date + 'T00:00:00');
        const dateStr = date.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        return (
          <div key={idx} className="log-sheet">
            {/* Log Sheet Header */}
            <div className="log-header">
              <div className="log-header-left">
                <div className="log-title">DRIVER'S DAILY LOG</div>
                <div className="log-subtitle">U.S. Department of Transportation</div>
              </div>
              <div className="log-header-right">
                <div className="log-date">{dateStr}</div>
                <div className="log-miles">Total Miles: <strong>{log.total_miles}</strong></div>
              </div>
            </div>

            {/* The ELD Grid */}
            <div className="canvas-wrapper">
              <ELDCanvas log={log} />
            </div>

            {/* Status Legend */}
            <div className="status-legend">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="legend-item">
                  <span className="legend-dot" style={{ background: color }} />
                  <span>{status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <strong>
                    {(log.totals[status] || 0).toFixed(2)}h
                  </strong>
                </div>
              ))}
            </div>

            {/* Remarks */}
            <div className="remarks-section">
              <strong>Remarks:</strong>
              <div className="remarks-entries">
                {log.entries
                  .filter(e => e.location)
                  .reduce((acc, e) => {
                    const last = acc[acc.length - 1];
                    if (!last || last.location !== e.location) acc.push(e);
                    return acc;
                  }, [])
                  .map((e, i) => (
                    <span key={i} className="remark">
                      {new Date(e.start_time).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })} — {e.location}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
