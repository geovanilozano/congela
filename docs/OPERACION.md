# Operación y rendimiento

Guía de cómo está desplegada y optimizada Congela en producción, y qué hacer si
se siente lenta.

## Arquitectura

- **Hosting:** Vercel (plan Hobby), región `iad1` (Washington, US-East).
- **Base de datos:** Neon PostgreSQL (plan gratis), región `us-east-1` — junto a
  Vercel para mínima latencia.
- **Fotos:** Vercel Blob.
- **Deploy:** automático al hacer push a `master` (Vercel + GitHub).

## Optimizaciones aplicadas

| Optimización | Qué resuelve |
|---|---|
| `src/app/loading.tsx` | Muestra un esqueleto **al instante** al cambiar de módulo (antes la pantalla se congelaba hasta terminar las consultas). |
| Consultas en paralelo (`Promise.all`) | Las páginas cargan sus datos en un solo viaje a la BD, no en serie. |
| Índices en `schema.prisma` | `@@index` en columnas de filtro (`fecha`, categorías, llaves foráneas) para que las consultas sigan rápidas al crecer los datos. |
| Región `iad1` (`vercel.json`) | Las funciones corren junto a Neon (`us-east-1`). |
| Conexión **pooled** de Neon | `DATABASE_URL` en Vercel usa el host `-pooler` (mejor para serverless). |
| **Driver serverless de Neon** (`@prisma/adapter-neon`) | Conexión por WebSocket → arranque en frío mucho más rápido (bajó de ~5-9s a ~1.3s). |
| Keep-alive | Mantiene la BD despierta (ver abajo). |

## Keep-alive (evitar el "arranque en frío")

Neon en plan gratis **suspende la base de datos tras ~5 min** de inactividad. El
primer clic después de una pausa la despierta y tarda varios segundos. Para
evitarlo:

- **Endpoint:** `GET /api/keepalive` hace un `SELECT 1` ligero. Está excluido del
  guard de sesión en `src/proxy.ts`.
- **Disparador:** el workflow `.github/workflows/keepalive.yml` le hace ping cada
  ~1 minuto (GitHub Actions, gratis en repos públicos). Vercel Hobby no sirve para
  esto porque solo permite cron 1 vez al día.

**Probarlo a mano:**
```bash
curl -i https://congela.vercel.app/api/keepalive   # -> 200 {"ok":true}
```
También se puede disparar el workflow desde GitHub → Actions → "Keep Neon awake" →
Run workflow.

**Alternativa aún más confiable (opcional):** GitHub Actions a veces se retrasa en
horas pico. Un pinger externo como [cron-job.org](https://cron-job.org) (gratis)
apuntando a `https://congela.vercel.app/api/keepalive` cada 2-3 min mantiene Neon
despierto con más puntualidad. Si se usa, conviene desactivar el workflow de
GitHub para no duplicar.

## Si se siente lenta

1. **Verifica que la BD responde:** `curl -i https://congela.vercel.app/api/keepalive`
2. **Mide el primer byte** (procesamiento del servidor):
   ```bash
   curl -s -o /dev/null -w "TTFB=%{time_starttransfer}s\n" https://congela.vercel.app/login
   ```
   - ~0.4-0.5s = caliente (bien).
   - ~1-1.5s = arranque en frío (normal en plan gratis).
   - +3s de forma consistente = revisar (¿keep-alive caído? ¿Neon suspendida?).

## Cuándo conviene pagar

El plan gratis **siempre** tendrá algún arranque en frío ocasional. Para eliminarlo:

- **Neon de pago (~$19/mes, plan Launch):** desactiva el auto-suspend → la BD nunca
  se duerme. **Es el gasto más directo y barato** para ganar velocidad.
- **Vercel Pro (~$20/mes):** sube límites y da más recursos; **no elimina** los
  arranques en frío por sí solo. Conviene sobre todo si te quedas sin **Fluid CPU**
  (revisa el uso en el dashboard: se comparte entre todos tus proyectos).

**Recomendación:** con el keep-alive y el driver de Neon basta para el día a día.
Si se necesita más velocidad, **Neon de pago antes que Vercel Pro**.
