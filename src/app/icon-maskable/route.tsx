import { ImageResponse } from "next/og";

// Ícono MASKABLE para Android (íconos adaptativos): el sistema recorta ~20% de los bordes,
// así que el fondo va a sangre (gradiente lleno) y el glifo queda dentro de la "zona segura"
// (~80% central) para que nunca se corte. Separado de /icon (que es el ícono normal).

export function GET() {
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
        {/* Tarjeta más chica (240px de 512 ≈ 47%) para caber holgada dentro del círculo seguro. */}
        <div
          style={{
            width: "240px",
            height: "240px",
            borderRadius: "56px",
            background: "rgba(255,255,255,0.96)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 150, fontWeight: 800, color: "#0369a1", fontFamily: "sans-serif" }}>C</div>
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
