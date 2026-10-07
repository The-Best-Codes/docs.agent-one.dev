type ScreenshotPoint = { x: number; y: number; label: string };

type AnnotatedScreenshotProps = {
  name: string;
  alt: string;
  caption: string;
  src?: string;
  width?: number;
  height?: number;
  crop: [number, number, number, number];
  points: ScreenshotPoint[];
};

/** Vector callouts preserve the captured pixels and remain sharp when enlarged. */
export function AnnotatedScreenshot({
  name,
  alt,
  caption,
  src = `/images/docs/current/${name}.jpg`,
  width = 2900,
  height = 1626,
  crop,
  points,
}: AnnotatedScreenshotProps) {
  const radius = crop[2] * 0.022;

  return (
    <figure className="my-8 overflow-hidden rounded-xl border bg-fd-card">
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open full screenshot: ${alt}`}
      >
        <svg
          viewBox={crop.join(" ")}
          role="img"
          aria-label={alt}
          className="block h-auto w-full"
          style={{ aspectRatio: `${crop[2]} / ${crop[3]}` }}
        >
          <image href={src} width={width} height={height} />
          <g aria-hidden="true">
            {points.map((point, index) => (
              <g key={`${point.x}-${point.y}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill="#facc15"
                  stroke="#171717"
                  strokeWidth={radius * 0.15}
                />
                <text
                  x={point.x}
                  y={point.y}
                  dy=".35em"
                  textAnchor="middle"
                  fill="#171717"
                  fontFamily="system-ui, sans-serif"
                  fontSize={radius * 1.2}
                  fontWeight="800"
                >
                  {index + 1}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </a>
      <figcaption className="border-t px-5 py-4 text-sm">
        <p className="!mt-0 text-fd-muted-foreground">{caption}</p>
        <ol className="!mb-0 space-y-2">
          {points.map((point) => (
            <li key={point.label}>{point.label}</li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
