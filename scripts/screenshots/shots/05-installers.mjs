// The macOS installer window, composed from the app's real DMG background and icons.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sources = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../sources",
);
const dataUrl = (file) =>
  `data:image/png;base64,${fs.readFileSync(path.join(sources, file)).toString("base64")}`;

const icon = (src, x, label) => `
  <div style="position:absolute;left:${x - 64}px;top:${170 - 64}px;width:128px;text-align:center">
    <img src="${dataUrl(src)}" style="width:128px;height:128px;display:block">
    <div style="font:13px -apple-system,BlinkMacSystemFont,sans-serif;color:#1d1d1f;margin-top:4px">${label}</div>
  </div>`;

export default [
  {
    id: "installation/macos-dmg",
    title: "AgentOne",
    viewport: { width: 660, height: 400 },
    html: `<body style="margin:0"><div style="position:relative;width:660px;height:400px;background:url(${dataUrl("dmg-background.png")}) 0 0/660px 400px">
      ${icon("app-icon.png", 180, "AgentOne")}${icon("applications-folder.png", 480, "Applications")}</div></body>`,
    annotate: async () => [
      {
        type: "box",
        rect: { x: 108, y: 98, width: 144, height: 164 },
        marker: "1",
        anchor: "l",
      },
      {
        type: "box",
        rect: { x: 408, y: 98, width: 144, height: 164 },
        marker: "2",
        anchor: "r",
      },
    ],
  },
];
