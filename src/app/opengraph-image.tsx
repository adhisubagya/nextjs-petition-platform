import { ImageResponse } from "next/og";
import { getPetition } from "@/lib/petition";

export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Petition";

export default async function OgImage() {
  const { title, signatureCount } = await getPetition();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 80,
          background: "radial-gradient(80% 80% at 50% 0%, #262626, #0a0a0a)",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 28, color: "#a3a3a3", letterSpacing: 4, textTransform: "uppercase" }}>Petition</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 16, letterSpacing: -2 }}>{title}</div>
        <div style={{ fontSize: 40, marginTop: 28, color: "#a3a3a3" }}>{`${signatureCount.toLocaleString("en-US")} signatures`}</div>
      </div>
    ),
    size,
  );
}
