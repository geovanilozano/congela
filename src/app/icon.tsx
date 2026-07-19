import { ImageResponse } from "next/og";

// Ícono de la app generado con código (sin archivos PNG). Fondo azul cielo con un
// "cubo" blanco y la inicial — combina con la marca Congela (🧊 hielo).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            width: "300px",
            height: "300px",
            borderRadius: "72px",
            background: "rgba(255,255,255,0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 20px 60px rgba(255,255,255,0.7)",
          }}
        >
          <div style={{ fontSize: 200, fontWeight: 800, color: "#0369a1", fontFamily: "sans-serif" }}>C</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
