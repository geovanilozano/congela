# Plan de Construcción — App de Control "Congela" (Producción y Venta de Hielo)

> Documento de planeación. Fecha: 2026-07-03.
> Aquí está **qué hay que hacer** y **en qué orden**. Cada fase tiene su lista de tareas
> para marcar a medida que se construye.

---

## 1. Objetivo

Aplicación **web** (funciona en celular y computador) para controlar todo el negocio de
hielo: desde la **inversión inicial** y el **crédito con que se pagó**, hasta la operación
diaria (producción, inventario, ventas, personal), el **consumo y generación de energía**
(paneles solares + medidor centralizado) y los **reportes financieros con gráficos**.

Idea central del dinero:
- De **cada ingreso** el sistema **aparta automáticamente** el dinero del **arriendo**, la
  **cuota del crédito** y los **costos de operación**. Lo que sobra es **utilidad**.
- Cuando el **crédito quede pagado**, el dinero que se apartaba para la cuota se **reasigna
  automáticamente** a utilidad / reinversión, y el sistema lo avisa.

---

## 2. Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Plataforma | Web (celular + PC), una sola app. App móvil nativa queda para después. |
| Energía | Inversor con nube (Growatt / Deye-Sunsynk / Huawei). **Marca exacta: por confirmar.** |
| Por dónde empezar | Núcleo financiero (Inversión + Crédito + Fondos + Ventas). |

## 3. Tecnología (stack)

| Capa | Herramienta | Para qué |
|------|-------------|----------|
| App web (front + back) | **Next.js (React) + TypeScript** | Una sola base de código, funciona en celular y PC |
| Base de datos | **PostgreSQL (Supabase)** | Guardar toda la información |
| Inicio de sesión | **Supabase Auth** | Usuarios y permisos (dueño, cajero, operario) |
| Fotos de facturas | **Supabase Storage** | Subir y guardar la foto de cada factura/comprobante |
| Gráficos | **Recharts** | Tableros e indicadores |
| Estilos | **Tailwind CSS** | Diseño limpio y responsive |
| Lectura de paneles | **Integración por API del inversor** (tarea programada en el servidor) | Traer generación solar automáticamente |
| OCR de facturas (opcional, fase posterior) | Servicio OCR | Extraer datos de la foto de la factura |
| Hospedaje | **Vercel** (app) + **Supabase** (datos) | Publicar en internet |

---

## 4. Cómo se conecta la energía (arquitectura)

Tres fuentes de datos de energía, todas terminan en la misma base de datos:

1. **Generación solar (paneles):** el inversor sube sus datos a su nube (Growatt/Deye/
   Huawei). Una **tarea programada** en el servidor consulta la API del inversor cada X
   minutos y guarda: kW generados, energía del día (kWh), etc.
2. **Consumo de la empresa (medidor centralizado):** medidor en el tablero principal que
   dice cuánta energía consume todo el local. Se lee por API/MQTT o se carga manual.
3. **Recibos del proveedor (energía, agua, gas, internet):** se cargan manualmente con
   foto del recibo. De aquí sale lo que **se va a pagar** y se compara contra lo generado
   por los paneles (**cuánto se ahorró**).

Con eso el sistema calcula la **relación**:
`Energía que llega = Generación solar + Energía de red`, y el **ahorro** = energía solar
usada × precio del kWh, además del **costo evitado en el recibo**.

> El módulo de energía se construye de forma que **funcione con carga manual desde el día 1**
> y la conexión automática al inversor se activa cuando confirmemos la marca.

---

## 5. Modelo de datos (tablas principales)

**Inversión y crédito**
- `inversion` — cada rubro comprado (paneles, cubeteros, refrigeradores, picadora, etc.): descripción, proveedor, valor, fecha, ¿contado o crédito?, foto factura.
- `creditos` — monto financiado, entidad, tasa, plazo, nº de cuotas, valor cuota, fecha inicio, estado.
- `cuotas_amortizacion` — por cada cuota: nº, fecha vencimiento, valor, capital, interés, saldo, estado (pendiente/pagada/vencida).
- `pagos_credito` — pagos hechos: fecha, valor, cuota asociada, comprobante (foto).

**Distribución del dinero (fondos)**
- `fondos` — Arriendo, Cuota crédito, Operación, Reserva, Utilidad, Reinversión.
- `reglas_reparto` — por fondo: tipo (porcentaje o monto fijo), valor, prioridad, activo sí/no.
- `movimientos_fondos` — cada vez que entra o sale dinero de un fondo.

**Operación**
- `activos` — cubeteros, refrigeradores, paneles, inversores, medidores, picadora: marca, capacidad, consumo, garantía, estado.
- `produccion` — por día/turno/cubetero: bolsas o kilos, tipo (cubo/picado), pérdidas.
- `inventario` — bolsas vacías, bolsas llenas, hielo disponible, insumos; entradas/salidas.
- `clientes` — datos, tipo (contado/crédito), cupo.
- `ventas` — factura, cliente, productos, cantidades, precios, forma de pago, total.
- `factura_items` — detalle de cada venta.
- `facturas_foto` — foto de factura física subida (+ datos por OCR si aplica).
- `compras_gastos` — bolsas, mantenimiento, nómina, transporte, arriendo, agua, gas, internet, impuestos; con comprobante.

**Energía**
- `energia_generacion` — lecturas de generación solar (del inversor).
- `medidor_lecturas` — consumo del medidor centralizado.
- `recibos_servicios` — recibos de energía, agua, gas, internet: periodo, consumo, valor, foto.

**Personas y sistema**
- `empleados` — datos, turnos, asistencia, pagos, producción por empleado.
- `mantenimientos` — preventivos/correctivos por equipo, con recordatorio y costo.
- `usuarios` / roles — dueño (todo), cajero (ventas/caja), operario (producción/inventario).

---

## 6. Lógica financiera (el corazón — "revísalo bien")

### 6.1 Crédito de la inversión (amortización)
- Al registrar un crédito, el sistema **genera automáticamente la tabla de cuotas** (sistema
  de cuota fija / francés): cada cuota se separa en **capital** e **interés** y se calcula el
  **saldo restante**.
- Muestra siempre: **saldo pendiente**, total pagado, total de intereses, **% de avance** y la
  **fecha estimada en que quedas libre de deuda**.
- Cada pago se registra contra su cuota, con **foto del comprobante**.
- **Alertas:** cuota por vencer y cuota vencida.

### 6.2 Distribución de cada ingreso (fondos / "bolsillos")
En cada venta o en el **cierre de caja diario**, el ingreso se reparte **en este orden**:

1. **Arriendo** → monto fijo del mes (se va juntando hasta cubrirlo).
2. **Cuota del crédito** → monto fijo = valor de la cuota.
3. **Operación** → bolsas, energía de red, mantenimiento, nómina (porcentaje o estimado).
4. **Reserva / imprevistos** → un % configurable.
5. **Utilidad del dueño** → lo que queda.

Cada fondo muestra su **saldo acumulado** y si **ya alcanzó** para cubrir el compromiso del mes.
Así **"todo sale de ahí"**: ningún gasto fijo depende de plata externa.

### 6.3 Regla "cuando se pague la inversión"
- Cuando el saldo del crédito llega a **cero**, el crédito se marca **PAGADO**.
- El fondo **"Cuota del crédito" se desactiva** y su monto se **reasigna automáticamente** a
  **Utilidad y/o Reinversión** (según lo configures).
- El sistema **notifica** el cambio y muestra la **comparación de utilidad ANTES vs DESPUÉS**
  de quedar libre de deuda.
- **Simulador:** "¿cuánto voy a ganar cuando termine de pagar?" — proyección con y sin cuota.

---

## 7. Fases de construcción (checklist)

### Fase 0 — Cimientos (base del proyecto)
- [ ] Crear proyecto Next.js + TypeScript + Tailwind
- [ ] Conectar Supabase (base de datos, auth, storage)
- [ ] Login y roles (dueño / cajero / operario)
- [ ] Layout base: menú, navegación, diseño responsive (celular + PC)

### Fase 1 — Núcleo financiero (empezamos aquí) ⭐
- [ ] Módulo **Inversión inicial** (registrar rubros + foto de factura)
- [ ] Módulo **Crédito** con tabla de amortización automática
- [ ] Registro de **pagos de cuota** + comprobante + alertas
- [ ] Módulo **Fondos** (reglas de reparto configurables)
- [ ] Módulo **Ventas y facturación** (crear factura, clientes, formas de pago)
- [ ] **Cierre de caja diario** que reparte el ingreso en los fondos
- [ ] **Regla automática** al saldar el crédito (reasignar a utilidad)
- [ ] Tablero financiero básico (ingresos, gastos, utilidad, saldo del crédito)

### Fase 2 — Energía y servicios
- [x] Carga manual de **generación solar** y **consumo del medidor**
- [x] Módulo de **recibos** (energía, agua, gas, internet) con foto
- [x] Cálculo de **ahorro solar** y comparación generación vs consumo vs red
- [ ] **Conexión automática** a la API del inversor (según marca confirmada) ← pendiente marca

### Fase 3 — Operación ✅
- [x] **Producción de hielo** (por día/turno/cubetero)
- [x] **Inventario** (bolsas, hielo, insumos) + alertas de stock bajo
- [x] **Compras y gastos** con comprobante (foto)
- [x] **Activos y equipos**

### Fase 4 — Personas y mantenimiento ✅
- [x] **Personal** (asistencia, pagos, producción por empleado)
- [x] **Mantenimiento** (preventivo/correctivo + alertas + costo a gastos)

### Fase 5 — Reportes y extras
- [ ] Tablero de **KPIs** completo y gráficos
- [ ] **Recuperación de inversión** y punto de equilibrio
- [ ] **Costo real por bolsa** y margen
- [ ] Exportar a **Excel y PDF**
- [ ] **OCR** de facturas (opcional)
- [ ] Alertas: inventario, consumo, temperatura, mantenimiento
- [ ] Respaldos de información

---

## 8. Roles y seguridad
- **Dueño:** ve y edita todo (finanzas, reportes, configuración de fondos).
- **Cajero:** ventas, facturas, cierre de caja.
- **Operario:** producción e inventario.
- Cada usuario con su clave. Datos protegidos por permisos según rol.

---

## 9. Qué sigue
1. Confirmar este plan.
2. Convertir la **Fase 1** en un plan de implementación detallado (paso a paso).
3. Empezar a construir por los cimientos (Fase 0) y luego el núcleo financiero (Fase 1).
