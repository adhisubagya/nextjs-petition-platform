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
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#fff", color: "#171717" }}>
        <div style={{ fontSize: 72, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#525252" }}>{`${signatureCount.toLocaleString("en-US")} signatures`}</div>
      </div>
    ),
    size,
  );
}
