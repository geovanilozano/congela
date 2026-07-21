// Pantalla que muestra el service worker cuando el usuario navega sin conexión.
// Es estática (sin datos) para poder cachearla e mostrarla sin red.
export const metadata = { title: "Sin conexión — Congela" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-[80vh] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <div className="text-6xl">🧊</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-800">Sin conexión</h1>
        <p className="mt-2 text-sm text-slate-500">
          Congela necesita internet para mostrar tus datos en vivo (ventas, caja, medidores…).
          Revisa tu conexión e intenta de nuevo.
        </p>
        <p className="mt-4 text-xs text-slate-400">La app ya está instalada; abrirá normal cuando vuelva la señal.</p>
      </div>
    </div>
  );
}
