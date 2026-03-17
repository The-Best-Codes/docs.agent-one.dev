import { getPageImage, source } from "@/lib/source";
import { ImageResponse } from "@takumi-rs/image-response";
import { notFound } from "next/navigation";

export const revalidate = false;

const fontData = fetch(
  new URL(
    "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2",
  ),
).then((res) => res.arrayBuffer());

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        color: "#fff",
        padding: "64px",
        fontFamily: "Space Grotesk",
      }}
    >
      <p
        style={{
          fontSize: "48px",
          fontWeight: 600,
          margin: 0,
          marginBottom: "12px",
        }}
      >
        AgentOne
      </p>
      <p
        style={{
          fontWeight: 800,
          fontSize: "82px",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {page.data.title}
      </p>
      {page.data.description && (
        <p
          style={{
            fontSize: "52px",
            color: "rgba(255,255,255,0.7)",
            margin: 0,
            marginTop: "8px",
            lineHeight: 1.2,
          }}
        >
          {page.data.description}
        </p>
      )}
    </div>,
    {
      width: 1200,
      height: 630,
      format: "webp",
      fonts: [
        {
          name: "Space Grotesk",
          data: await fontData,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
