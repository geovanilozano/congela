<h1 align="center">🧊 Congela</h1>

<p align="center">
  <b>Sistema de gestión integral para un negocio de producción y venta de hielo.</b><br/>
  Finanzas, ventas, energía solar, inventario, personal y reportes — en una sola app web.
</p>

<p align="center">
  <i>Full-stack management system for an ice production business: finances, sales, solar energy, inventory, staff and reports.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma%207-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
</p>

---

## ✨ Qué incluye

- **Núcleo financiero:** inversión inicial, crédito con tabla de amortización, reparto automático de cada ingreso en fondos (arriendo, cuota del crédito, operación, reserva, utilidad) y reasignación automática al pagar la deuda.
- **Ventas y caja:** facturas, clientes, formas de pago, cuentas por cobrar y cierre de caja diario.
- **Energía y servicios:** generación de paneles solares vs. consumo, ahorro solar y recibos de energía, agua, gas e internet (con foto).
- **Operación:** activos y equipos, producción de hielo, inventario con alertas de stock bajo, compras y gastos (con foto de comprobante).
- **Personal y mantenimiento:** empleados, asistencia, pagos, producción por empleado y mantenimientos preventivos/correctivos con alertas.
- **Inteligencia:** login con roles (Dueño / Cajero / Operario), **OCR de facturas por foto con IA** (Claude Vision), conexión con **inversores solares Growatt** y exportación a **PDF/Excel**.
- **Reportes:** recuperación de la inversión, costo real por bolsa, margen, punto de equilibrio y utilidad.

---

## 🛠️ Tecnología

| Capa | Herramientas |
|------|--------------|
| Framework | Next.js 16 (App Router, Server Actions) · React 19 |
| Lenguaje | TypeScript 5 |
| Base de datos | PostgreSQL con Prisma 7 (`@prisma/adapter-pg`) |
| UI | Tailwind CSS 4 · Recharts |
| IA / OCR | `@anthropic-ai/sdk` (Claude Vision) |
| Archivos | Vercel Blob (producción) · carpeta local privada (desarrollo) |
| Pruebas | Vitest |
| Despliegue | Vercel |

---

## 🚀 Puesta en marcha

### Requisitos

- **Node.js 20+**
- Una base de datos **PostgreSQL**. La forma más rápida y gratis es crear una en [Neon](https://neon.tech) (o usar un Postgres local / Docker).

### Pasos

```bash
# 1. Clonar e instalar dependencias (genera el cliente de Prisma automáticamente)
git clone https://github.com/geovanilozano/congela.git
cd congela
npm install

# 2. Crear el archivo de configuración a partir de la plantilla
cp .env.example .env
```

Edita el `.env` y completa:

| Variable | Obligatoria | Para qué sirve |
|----------|:-----------:|----------------|
| `DATABASE_URL` | ✅ | Cadena de conexión de tu PostgreSQL (Neon, local, etc.). |
| `AUTH_SECRET` | ✅ | Firma las sesiones y cifra credenciales. Genérala con `openssl rand -base64 32`. **Sin una clave fuerte, cualquiera podría entrar como Dueño.** |
| `BLOB_READ_WRITE_TOKEN` | Solo producción | Token de Vercel Blob para guardar fotos. En local se dejan en `./archivos`. |
| `ANTHROPIC_API_KEY` | Opcional | Clave de Claude para el OCR de facturas (también se puede configurar desde **Ajustes**). |

```bash
# 3. Crear las tablas en la base de datos
npx prisma db push

# 4. Iniciar la aplicación
npm run dev
```

Abre **http://localhost:3000**. La primera vez, la app te pedirá crear el usuario **Dueño** (el que ve y edita todo).

### Pruebas

```bash
npm test
```

---

## ☁️ Despliegue en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com).
2. Define las variables de entorno: `DATABASE_URL`, `AUTH_SECRET` y `BLOB_READ_WRITE_TOKEN`.
3. Vercel usa el `buildCommand` de `vercel.json` (`prisma db push --skip-generate && next build`), así que las tablas se crean solas en el primer despliegue.

> **Zona horaria:** las fechas se manejan en la hora local del negocio. Si el servidor está en otra zona, define `TZ=America/Bogota`.

---

## 📁 Estructura

```
src/
├─ app/          # Rutas (App Router): ventas, caja, crédito, energía, reportes…
│  └─ api/       # Endpoints: OCR, exportación, servir archivos privados
├─ components/   # UI reutilizable (charts, botones, inputs)
├─ lib/          # Lógica: auth, cifrado, acceso a datos, ajustes
└─ generated/    # Cliente de Prisma (autogenerado, no se versiona)
prisma/
└─ schema.prisma # Modelo de datos (montos en centavos para evitar redondeos)
```

---

## 🔒 Seguridad

- Las **fotos de facturas** se guardan en la carpeta privada `archivos/` (no en `public/`) y se sirven por `/api/archivo`, que exige sesión.
- La clave de la API de Claude se guarda **cifrada** en base de datos.
- `AUTH_SECRET` es obligatoria en producción: la app se niega a arrancar sin ella.

---

## 📸 Capturas

<!-- Agrega aquí capturas reales: docs/screenshots/dashboard.png, ventas.png, reportes.png -->
_Próximamente._

---

## 📄 Licencia

[MIT](LICENSE) © Geovani Lozano
