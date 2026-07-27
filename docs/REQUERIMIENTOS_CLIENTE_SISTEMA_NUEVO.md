# Requerimientos — SISTEMA NUEVO.xlsx (Cliente)

> Fuente: `docs/SISTEMA_NUEVO.xlsx` — 4 hojas: CLIENTES, CAJA, CAJA BANCARIA, INVENTARIO

---

## 1. CLIENTES — Solapa General (KPIs)

| KPI | Descripción |
|-----|-------------|
| Stock clientes activos | Conteo; excluir inactivos del numerador |
| Stock clientes suspendidos | Estado suspendido |
| Stock clientes con baja | Estado baja + bajas por mes (ideal) |
| Stock clientes con licencia | Con fecha inicio/fin; alerta al vencer |
| Número de cliente | Secuencial para control de stock (no contar inactivos) |

---

## 2. CLIENTES — Vista individual (ej. HERRERA Juan)

### Datos fijos
- Nombre, fecha inicio, profesión, domicilio recolección, teléfono, CUIT, condición IVA, horarios
- **Recorridos asignados:** Unidad + Semana + Día + Zona + Posición (ej. UNIDAD 1, 3º JUEVES, posición 15)
- Un cliente puede estar en **varios recorridos** (otras unidades/días)

### Grilla mensual (Ene–Dic)
Por cada mes:
- Fecha de visita
- Por producto: unidades, entregadas al cliente, retiradas al cliente, precio unitario, subtotal
- Abono efectivo / transferencia + fecha transferencia
- Debe, Haber, Saldo, Total
- **Cajas a favor** (mes sin entrega → acumula; mes siguiente descuenta)
- Observaciones (campo libre)
- Mes sin caja entregada → fila en **rojo**

### Control stock del cliente
- **Entregadas − Retiradas = cajas en poder del cliente**
- No confundir con inventario general ni con ventas cobradas

---

## 3. RECORRIDOS (Unidades / Camiones)

Matriz: **7 días × 4 semanas × N unidades (camiones)**

| Semana | Lun | Mar | Mié | Jue | Vie | Sáb | Dom |
|--------|-----|-----|-----|-----|-----|-----|-----|
| 1º | Zona | Zona | ... | | | | |
| 2º | | | | | | | |
| 3º | | | LANÚS | | | | |
| 4º | | | | | | | |

- Cada celda = **zona** (texto, ej. LANÚS, LOMAS DE ZAMORA)
- Cliente asignado a: IdCamion + IdSemana + IdDia + **Posicion** + opcional zona
- Búsqueda: "3º JUEVES" → listar clientes de ese recorrido
- Búsqueda por nombre cliente/proveedor con autocompletado

---

## 4. CAJA / Libro Diario

Columnas:
- Fecha, Concepto, Cliente/Proveedor (autocomplete)
- Recorrido asignado (informativo)
- Unidades (cantidad cajas)
- Precio unitario (desde concepto/producto preset)
- Debe, Haber, IVA%, IVA, Otros imp., Total, Saldo
- Forma pago: Efectivo / Transferencia banco
- **Impacta:** Inventario (entrada/salida), CC cliente, stock entregas cliente

Conceptos preset + ocasionales (sin alta permanente).

---

## 5. CAJA BANCARIA

Mismo control que caja pero solo movimientos bancarios (clientes, proveedores, transferencias).
Todo debe reflejarse en inventario cuando corresponda.

---

## 6. INVENTARIO

| Campo | Uso |
|-------|-----|
| ID, Fecha, Tipo, Concepto | Movimiento |
| Entrada / Salida / Stock | Stock **general vendible** |
| Cliente/Proveedor | Origen |
| Recupero | Entrada stock recuperado |

### Dos stocks distintos (crítico)
1. **Inventario general:** baja con **entregas a clientes** (tipo entrega), NO con ventas/retiros cobrados
2. **Stock en poder del cliente:** entregadas − retiradas por cliente
3. **Recuperados:** tabla aparte (ya existe `InventarioRecuperado`)

Producto puede tener alias/nombre distinto en entrega vs venta pero mismo IdProducto.

Filtros por rango de fechas: totales entregas, recuperadas, compras.

---

## 7. Reglas de negocio clave

- Retiro cobrado ≠ entrega gratuita al cliente
- Recuperado entra a inventario recuperado, no al vendible
- Cliente inactivo no cuenta en stock de clientes ni en numeración
- Licencia: alerta al cumplir plazo
- Cajas a favor: libro diario registra → cliente muestra saldo a favor

---

## 8. UX / Diseño

- Intuitivo al 100%, responsive (mobile/tablet/desktop)
- Autocomplete en clientes/proveedores/conceptos
- Colores: rojo = mes sin entrega, verde = ok, alertas licencia
- Hub unificado por cliente (ya iniciado en `/Clientes/Gestion`)

---

## 9. Mapa de implementación

| Módulo | Estado previo | Acción |
|--------|---------------|--------|
| Hub Clientes | Parcial | Ampliar tabs + grilla mensual |
| Estados/Licencia | Parcial | Fechas licencia + alertas |
| Camiones/Unidades | Hecho | Renombrar UI a "Unidad" |
| Recorridos | **Nuevo** | Matriz + asignación clientes |
| Libro Diario Caja | Parcial | Columnas Excel + autocomplete |
| Caja Bancaria | Parcial | Vista filtrada bancos |
| Inventario dual | Parcial | Stock cliente + filtros fecha |
| KPIs General | **Nuevo** | Dashboard clientes |
