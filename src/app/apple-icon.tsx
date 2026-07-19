import { ImageResponse } from "next/og";

// Ícono para la pantalla de inicio de iOS (Añadir a inicio en Safari).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #38bdf8, #0369a1)",
        }}
      >
        <div
          style={{
            width: "108px",
            height: "108px",
            borderRadius: "26px",
            background: "rgba(255,255,255,0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 800, color: "#0369a1", fontFamily: "sans-serif" }}>C</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
