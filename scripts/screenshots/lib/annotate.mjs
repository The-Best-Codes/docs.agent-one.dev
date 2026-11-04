// The one annotation style used across the docs. Annotations are drawn into the PNG
// (not overlaid in HTML), so every image looks the same wherever it's shown.
//
// Rules every annotation follows:
//   - Markers are centered on one side of their target ("t", "b", "l", or "r") and sit
//     outside it, so they never cover what they point at.
//   - "box" outlines one element or region. Boxes must not touch or overlap each other.
//   - "pin" is for items that sit next to each other (menu items, icon rows): a marker with
//     a short leader line and no outline.
// Layout problems (overlaps, markers pushed off the image) are reported as warnings.
//
// Coordinates are CSS pixels of the captured viewport. Supported annotations:
//   { type: "box", rect, marker?: "1", anchor?: "t"|"b"|"l"|"r" }
//   { type: "pin", rect, marker: "2", anchor?, leader?: px, gap?: px (dot distance from target) }
//   { type: "marker", rect | point, marker: "2", anchor? }
//   { type: "label", rect, text: "Click here", side?: "right"|"left"|"top"|"bottom", marker? }
//   { type: "arrow", from: point, to: point }
// Options: { frame: "window" | "plain", theme: "light" | "dark", title, spotlight: bool, crop: rect }

export const ACCENT = "#FF5B2E";
const SCALE = 2;
const MARKER_RADIUS = 12;
const BOX_PADDING = 4;
const MARKER_GAP = 6;
const PIN_LEADER = 22;
const PIN_GAP = 6;
const SIDES = { t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] };
const CORNER_TO_SIDE = { tl: "t", tr: "t", bl: "b", br: "b", c: "t" };

const sideOf = (anchor = "t") =>
  SIDES[anchor] ? anchor : (CORNER_TO_SIDE[anchor] ?? "t");

const overlaps = (a, b, tolerance = 0) =>
  a.x < b.x + b.width + tolerance &&
  b.x < a.x + a.width + tolerance &&
  a.y < b.y + b.height + tolerance &&
  b.y < a.y + a.height + tolerance;

/**
 * Where a marker goes: on one side of `rect`, `distance` beyond its edge. It's centered on
 * that side unless `align` is "start" or "end" (for tall or wide regions whose middle is busy).
 */
function markerCenter(rect, side, distance, align = "center") {
  const [dx, dy] = SIDES[side];
  let [x, y] = anchorPoint(rect, side);
  const inset = MARKER_RADIUS + 16;
  if (align !== "center") {
    if (dx !== 0)
      y = align === "start" ? rect.y + inset : rect.y + rect.height - inset;
    else x = align === "start" ? rect.x + inset : rect.x + rect.width - inset;
  }
  return [x + dx * distance, y + dy * distance];
}

function pad(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function anchorPoint(rect, anchor = "tl") {
  const { x, y, width: w, height: h } = rect;
  const points = {
    tl: [x, y],
    tr: [x + w, y],
    bl: [x, y + h],
    br: [x + w, y + h],
    l: [x, y + h / 2],
    r: [x + w, y + h / 2],
    t: [x + w / 2, y],
    b: [x + w / 2, y + h],
    c: [x + w / 2, y + h / 2],
  };
  return points[anchor];
}

function escapeXml(value) {
  return String(value).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

function markerSvg([cx, cy], label) {
  return `<g filter="url(#shadow)">
    <circle cx="${cx}" cy="${cy}" r="${MARKER_RADIUS}" fill="${ACCENT}" stroke="#fff" stroke-width="2.5"/>
    <text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="13.5" font-weight="700" fill="#fff">${escapeXml(label)}</text>
  </g>`;
}

function labelSvg(rect, text, side = "right", marker) {
  const charWidth = 7.4;
  const width = Math.ceil(text.length * charWidth + (marker ? 44 : 24));
  const height = 30;
  const gap = 22;
  const [ax, ay] = anchorPoint(
    rect,
    { right: "r", left: "l", top: "t", bottom: "b" }[side],
  );
  let x = ax + gap;
  let y = ay - height / 2;
  if (side === "left") x = ax - gap - width;
  if (side === "top") ((x = ax - width / 2), (y = ay - gap - height));
  if (side === "bottom") ((x = ax - width / 2), (y = ay + gap));
  const [lx, ly] = {
    right: [x, y + height / 2],
    left: [x + width, y + height / 2],
    top: [x + width / 2, y + height],
    bottom: [x + width / 2, y],
  }[side];
  const textX = x + (marker ? 34 : 12);
  return `<g filter="url(#shadow)">
    <line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly}" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="${ax}" cy="${ay}" r="4" fill="${ACCENT}" stroke="#fff" stroke-width="1.5"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${ACCENT}" stroke="#fff" stroke-width="2"/>
    ${marker ? `<circle cx="${x + 16}" cy="${y + height / 2}" r="10" fill="#fff"/><text x="${x + 16}" y="${y + height / 2 + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${ACCENT}">${escapeXml(marker)}</text>` : ""}
    <text x="${textX}" y="${y + height / 2 + 0.5}" dominant-baseline="central" font-size="13" font-weight="600" fill="#fff">${escapeXml(text)}</text>
  </g>`;
}

function arrowSvg(from, to) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 12;
  const p1 = [
    x2 - head * Math.cos(angle - 0.45),
    y2 - head * Math.sin(angle - 0.45),
  ];
  const p2 = [
    x2 - head * Math.cos(angle + 0.45),
    y2 - head * Math.sin(angle + 0.45),
  ];
  return `<g filter="url(#shadow)">
    <line x1="${x1}" y1="${y1}" x2="${x2 - 6 * Math.cos(angle)}" y2="${y2 - 6 * Math.sin(angle)}" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round"/>
    <path d="M${x2},${y2} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} Z" fill="${ACCENT}" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round"/>
  </g>`;
}

/** Builds the overlay SVG for a given viewport size and list of annotations. */
function overlaySvg(
  width,
  height,
  rawAnnotations,
  spotlight,
  warnings = [],
  footprints = null,
) {
  const inset = 4;
  const clampRect = (r) => {
    if (!r) return r;
    const x = Math.max(inset, r.x);
    const y = Math.max(inset, r.y);
    return {
      x,
      y,
      width: Math.min(width - inset, r.x + r.width) - x,
      height: Math.min(height - inset, r.y + r.height) - y,
    };
  };
  const annotations = rawAnnotations.map((a) => ({
    ...a,
    rect: a.rect && clampRect(a.rect),
  }));
  const boxes = annotations
    .filter((a) => a.type === "box")
    .map((a) => pad(a.rect, a.padding ?? BOX_PADDING));
  const holes = boxes.map(
    (b) =>
      `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="8" fill="#000"/>`,
  );
  const parts = [];

  if (spotlight && boxes.length) {
    parts.push(`<mask id="spot"><rect width="${width}" height="${height}" fill="#fff"/>${holes.join("")}</mask>
      <rect width="${width}" height="${height}" fill="rgba(15,18,28,0.42)" mask="url(#spot)"/>`);
  }

  for (const a of annotations) {
    if (a.type === "box") {
      const b = pad(a.rect, a.padding ?? BOX_PADDING);
      parts.push(
        `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="8" fill="none" stroke="#fff" stroke-width="5" opacity="0.9"/>`,
        `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="8" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`,
      );
    }
  }
  for (const a of annotations) {
    if (a.type === "arrow") parts.push(arrowSvg(a.from, a.to));
    if (a.type === "label")
      parts.push(
        labelSvg(
          pad(a.rect, a.padding ?? BOX_PADDING),
          a.text,
          a.side,
          a.marker,
        ),
      );
  }
  const markers = [];
  for (const a of annotations) {
    if (!a.marker || !["box", "marker", "pin"].includes(a.type)) continue;
    const side = sideOf(a.anchor);
    let center;
    if (a.point) center = a.point;
    else if (a.type === "pin") {
      center = markerCenter(
        a.rect,
        side,
        (a.gap ?? PIN_GAP) + (a.leader ?? PIN_LEADER) + MARKER_RADIUS - PIN_GAP,
        a.align,
      );
      const edge = markerCenter(a.rect, side, a.gap ?? PIN_GAP, a.align);
      footprints?.push({
        label: `${a.marker} (pin dot)`,
        x: edge[0] - 5,
        y: edge[1] - 5,
        width: 10,
        height: 10,
      });
      const [dx, dy] = SIDES[side];
      parts.push(
        `<line x1="${edge[0]}" y1="${edge[1]}" x2="${center[0] - dx * MARKER_RADIUS}" y2="${center[1] - dy * MARKER_RADIUS}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
        `<line x1="${edge[0]}" y1="${edge[1]}" x2="${center[0] - dx * MARKER_RADIUS}" y2="${center[1] - dy * MARKER_RADIUS}" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round"/>`,
        `<circle cx="${edge[0]}" cy="${edge[1]}" r="3.5" fill="${ACCENT}" stroke="#fff" stroke-width="1.5"/>`,
      );
    } else {
      const outer =
        a.type === "box" ? pad(a.rect, a.padding ?? BOX_PADDING) : a.rect;
      center = markerCenter(outer, side, MARKER_GAP + MARKER_RADIUS, a.align);
    }
    const min = MARKER_RADIUS + 4;
    const clamped = [
      Math.min(Math.max(center[0], min), width - min),
      Math.min(Math.max(center[1], min), height - min),
    ];
    if (clamped[0] !== center[0] || clamped[1] !== center[1]) {
      warnings.push(
        `marker ${a.marker} pushed back inside the image; choose another anchor`,
      );
    }
    markers.push({ label: a.marker, center: clamped });
    footprints?.push({
      label: a.marker,
      x: clamped[0] - MARKER_RADIUS - 3,
      y: clamped[1] - MARKER_RADIUS - 3,
      width: MARKER_RADIUS * 2 + 6,
      height: MARKER_RADIUS * 2 + 6,
    });
    parts.push(markerSvg(clamped, a.marker));
  }

  // Layout checks.
  const boxRects = annotations
    .filter((a) => a.type === "box")
    .map((a) => ({ a, r: pad(a.rect, a.padding ?? BOX_PADDING) }));
  for (let i = 0; i < boxRects.length; i++) {
    for (let j = i + 1; j < boxRects.length; j++) {
      if (overlaps(boxRects[i].r, boxRects[j].r, 2)) {
        warnings.push(
          `boxes ${boxRects[i].a.marker ?? "?"} and ${boxRects[j].a.marker ?? "?"} touch or overlap; use pins`,
        );
      }
    }
  }
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const mr = {
      x: m.center[0] - MARKER_RADIUS,
      y: m.center[1] - MARKER_RADIUS,
      width: MARKER_RADIUS * 2,
      height: MARKER_RADIUS * 2,
    };
    for (let j = i + 1; j < markers.length; j++) {
      const n = markers[j];
      if (
        Math.hypot(m.center[0] - n.center[0], m.center[1] - n.center[1]) <
        MARKER_RADIUS * 2 + 4
      ) {
        warnings.push(`markers ${m.label} and ${n.label} overlap`);
      }
    }
    for (const other of annotations) {
      if (!other.rect || other.marker === m.label) continue;
      const r =
        other.type === "box"
          ? pad(other.rect, other.padding ?? BOX_PADDING)
          : other.rect;
      if (overlaps(mr, r))
        warnings.push(
          `marker ${m.label} covers annotation ${other.marker ?? "?"}`,
        );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
    font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
    <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.3"/></filter></defs>
    ${parts.join("\n")}
  </svg>`;
}

/** The area an annotation needs, including its marker, so crops never cut markers off. */
function annotationExtent(a) {
  if (!a.rect) return null;
  const outer =
    a.type === "box" ? pad(a.rect, a.padding ?? BOX_PADDING) : a.rect;
  let extent = pad(outer, 6);
  if (a.marker && !a.point) {
    const side = sideOf(a.anchor);
    const distance =
      a.type === "pin"
        ? (a.gap ?? PIN_GAP) +
          (a.leader ?? PIN_LEADER) +
          MARKER_RADIUS -
          PIN_GAP
        : MARKER_GAP + MARKER_RADIUS;
    const [cx, cy] = markerCenter(
      a.type === "pin" ? a.rect : outer,
      side,
      distance,
      a.align,
    );
    const room = MARKER_RADIUS + 12;
    extent = unionRect(extent, {
      x: cx - room,
      y: cy - room,
      width: room * 2,
      height: room * 2,
    });
  }
  return extent;
}

function unionRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function shiftAnnotations(annotations, dx, dy) {
  const shiftRect = (r) => r && { ...r, x: r.x - dx, y: r.y - dy };
  const shiftPoint = (p) => p && [p[0] - dx, p[1] - dy];
  return annotations.map((a) => ({
    ...a,
    rect: shiftRect(a.rect),
    point: shiftPoint(a.point),
    from: shiftPoint(a.from),
    to: shiftPoint(a.to),
  }));
}

/**
 * Renders the final image with Chrome: screenshot + window frame + annotations.
 * `browser` is a Playwright browser; `png` is a Buffer at SCALE x the viewport.
 */
export async function renderAnnotated(
  browser,
  png,
  viewport,
  annotations = [],
  options = {},
) {
  const {
    frame = "window",
    theme = "light",
    title = "AgentOne",
    spotlight = false,
  } = options;
  let { width, height } = viewport;
  let offsetX = 0;
  let offsetY = 0;
  if (options.crop) {
    for (const a of annotations) {
      const extent = annotationExtent(a);
      if (extent) options.crop = unionRect(options.crop, extent);
    }
    offsetX = Math.max(0, Math.round(options.crop.x));
    offsetY = Math.max(0, Math.round(options.crop.y));
    width = Math.min(Math.round(options.crop.width), viewport.width - offsetX);
    height = Math.min(
      Math.round(options.crop.height),
      viewport.height - offsetY,
    );
  }
  const shifted = shiftAnnotations(annotations, offsetX, offsetY);
  const dark = theme === "dark";
  const titlebar = frame === "window" ? 32 : frame === "browser" ? 44 : 0;
  const margin = 28;

  const footprints = [];
  const html = `<!doctype html><html><head><style>
    html,body{margin:0;background:transparent}
    #stage{display:inline-block;padding:${margin}px ${margin}px ${margin + 8}px}
    .win{border-radius:${frame === "window" ? 12 : 10}px;overflow:hidden;position:relative;
      box-shadow:0 0 0 1px ${dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"},0 18px 40px -8px rgba(15,23,42,0.30),0 4px 12px rgba(15,23,42,0.10)}
    .bar{height:${titlebar}px;background:${dark ? "#2a2a2c" : "#ececec"};border-bottom:1px solid ${dark ? "#1b1b1d" : "#d6d6d6"};
      position:relative;display:flex;align-items:center;justify-content:center;
      font:600 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${dark ? "#bdbdbf" : "#4d4d4f"}}
    .lights{position:absolute;left:13px;top:50%;transform:translateY(-50%);display:flex;gap:8px}
    .lights i{width:12px;height:12px;border-radius:50%;display:block;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.18)}
    .url{display:flex;align-items:center;gap:7px;height:26px;padding:0 16px;min-width:360px;justify-content:center;border-radius:8px;
      background:${dark ? "#3a3a3c" : "#ffffff"};box-shadow:0 0 0 1px ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"};font-weight:500;font-size:12.5px}
    .shot{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${dark ? "#1c1c1e" : "#ffffff"}}
    .shot img{position:absolute;left:${-offsetX}px;top:${-offsetY}px;width:${viewport.width}px;height:${viewport.height}px}
    .shot svg{position:absolute;inset:0}
  </style></head><body><div id="stage"><div class="win">
    ${frame === "browser" ? `<div class="bar"><div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div><div class="url"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>${escapeXml(title)}</div></div>` : ""}
    ${frame === "window" ? `<div class="bar"><div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>${escapeXml(title)}</div>` : ""}
    <div class="shot"><img src="data:image/png;base64,${png.toString("base64")}"/>${overlaySvg(width, height, shifted, spotlight, options.warnings, footprints)}</div>
  </div></div></body></html>`;

  const page = await browser.newPage({
    deviceScaleFactor: SCALE,
    viewport: { width: width + 200, height: height + 200 },
  });
  await page.setContent(html);
  await page.locator("img").evaluate((img) => img.decode());
  // Flag markers that sit on top of real UI: the pixels under them should be plain background.
  const busy = await page.evaluate(
    ({ footprints, offsetX, offsetY, scale }) => {
      const img = document.querySelector(".shot img");
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return footprints
        .map((f) => {
          const x = Math.max(0, Math.round((f.x + offsetX) * scale));
          const y = Math.max(0, Math.round((f.y + offsetY) * scale));
          const w = Math.min(canvas.width - x, Math.round(f.width * scale));
          const h = Math.min(canvas.height - y, Math.round(f.height * scale));
          if (w <= 0 || h <= 0) return null;
          const data = ctx.getImageData(x, y, w, h).data;
          const counts = new Map();
          for (let i = 0; i < data.length; i += 4) {
            const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          const dominant = Math.max(...counts.values()) / (data.length / 4);
          // A dot may sit near a thin border line; a marker must sit on plain background.
          const limit = String(f.label).includes("pin dot") ? 0.6 : 0.9;
          return dominant < limit
            ? { label: f.label, background: Math.round(dominant * 100) }
            : null;
        })
        .filter(Boolean);
    },
    { footprints, offsetX, offsetY, scale: SCALE },
  );
  // Grainy page backgrounds defeat the pixel check, so textured shots skip it.
  for (const b of options.textured ? [] : busy) {
    options.warnings?.push(
      `marker ${b.label} covers UI content (only ${b.background}% plain background under it)`,
    );
  }
  const out = await page.locator("#stage").screenshot({ omitBackground: true });
  await page.close();
  return out;
}
