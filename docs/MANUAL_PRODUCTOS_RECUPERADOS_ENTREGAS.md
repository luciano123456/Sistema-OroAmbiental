# Manual — Productos recuperados y entregas

> Documento de continuidad para retomar el desarrollo.  
> Última actualización: **28 may 2026**  
> Repo: `Sistema-OroAmbiental`  
> Transcript de la sesión: `88084e99-d2f8-4769-91f8-1ae2b220282e`

Para retomar con el agente: *“Leé `docs/MANUAL_PRODUCTOS_RECUPERADOS_ENTREGAS.md` y continuá”*.

---

## 1. Concepto de negocio (importante)

Hay **tres cosas distintas** en una entrega. No mezclar:

| Concepto | Dónde vive | Efecto en stock |
|----------|------------|-----------------|
| **Entrega** (tipo 1) | `ClientesEntregasProductos` | Baja **inventario vendible** |
| **Retiro** (tipo 2) | `ClientesEntregasProductos` | Sube **inventario vendible** (devolución al depósito) |
| **Producto recuperado** | `ClientesEntregasProductosRecuperados` | Solo **InventarioRecuperado** (no toca stock vendible) |

Reglas acordadas:

- El **mismo producto** puede estar en entrega/retiro **y** en recuperados en la misma entrega (ej.: entregás 5 cajas, recuperás 2).
- Eso **no debe bloquear** el guardado.
- Si hay cruce, mostrar **cartel amarillo** informativo (no error rojo).
- Los recuperados **no suman al total $** de la entrega (signo 0 en totales).
- **Retiro ≠ recuperado**. Retiro es movimiento de stock vendible; recuperado es otro inventario.

---

## 2. Base de datos

### Tablas de inventario recuperado (stock global)

Definidas en EF (`SistemaOroAmbientalContext`):

- **`InventarioRecuperado`**: stock por `IdSucursal` + `IdProducto`
- **`InventarioRecuperadoMovimiento`**: historial (entrada/salida lógica)
  - `TipoMovimiento`: `ENTREGA` (desde entrega cliente) o `MANUAL`
  - `IdMovimiento`: id entrega o id movimiento manual

> Si la BD no tiene estas tablas, crearlas según el modelo EF o restaurar el script que se usó en la sesión (no quedó commiteado como `ProductosRecuperados.sql`; revisar migraciones / BD existente).

### Tabla de líneas recuperadas en entregas

Script: **`docs/sql/ClientesEntregasProductosRecuperados.sql`**

- Crea **`ClientesEntregasProductosRecuperados`**
- Migra filas viejas con `TipoMovimiento = 3` desde `ClientesEntregasProductos`
- Agrega CHECK en `ClientesEntregasProductos`: solo tipos **1 y 2**

**Ejecutar en SQL Server antes de probar guardado de entregas con recuperados.**

### Constantes de tipo (backend)

En `ClientesEntregasRepository.cs`:

```csharp
TIPO_LINEA_ENTREGA = 1
TIPO_LINEA_RETIRO = 2
TIPO_LINEA_RECUPERADO = 3  // solo UI/legacy; NO se guarda en ClientesEntregasProductos
```

---

## 3. Backend — flujo de guardado

### Entrada API (`VMClienteEntregaGuardar`)

```json
{
  "Lineas": [ /* entrega/retiro → ClientesEntregasProductos */ ],
  "LineasRecuperadas": [ /* recuperados → ClientesEntregasProductosRecuperados */ ]
}
```

- `ClientesEntregasController.MapLineasDesdeGuardar()` separa:
  - `Lineas` con tipo 1 o 2 → operación
  - `LineasRecuperadas` (+ legacy tipo 3 en Lineas) → recuperados
- `EditarInfo` devuelve:
  - `Lineas`: solo operación (excluye tipo 3 legacy)
  - `LineasRecuperadas`: tabla nueva + legacy tipo 3

### Service (`ClientesEntregasService`)

- Valida **operación** y **recuperados** por separado.
- Mínimo: al menos una línea en cualquiera de las dos listas.
- Duplicados:
  - Operación: no repetir `IdProducto` + mismo tipo (1 o 2).
  - Recuperados: no repetir `IdProducto` en la misma entrega.
- **Permitido**: mismo `IdProducto` en operación y en recuperados.

### Repository (`ClientesEntregasRepository`)

- Totales de entrega: solo líneas de **operación** (`SignoLinea` entrega +1, retiro -1).
- Stock vendible: `RegistrarStockEntrega()` solo para tipos 1/2.
- Stock recuperado: `RegistrarStockRecuperadoEntrega()` → `InventarioRecuperadoRepository.RegistrarEntrada()` con `TIPO_ENTREGA`.
- Insert/Update/Eliminar: maneja ambas colecciones; al actualizar revierte stock recuperado vía `RevertirMovimientosEntrega(idEntrega)`.

### Productos recuperados (pantalla dashboard)

| Capa | Archivo |
|------|---------|
| Controller | `ProductosRecuperadosController.cs` |
| Service | `ProductosRecuperadosService.cs` |
| Repository | `ProductosRecuperadosRepository.cs` |
| DTOs | `ProductosRecuperadosDtos.cs`, `VMProductosRecuperados.cs` |

Endpoints:

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/ProductosRecuperados` | Vista Index |
| POST | `/ProductosRecuperados/ListaHistorial` | Historial filtrado |
| POST | `/ProductosRecuperados/Dashboard` | KPIs, más/menos recuperados |
| GET | `/ProductosRecuperados/StockRecuperado` | Cards de stock |
| POST | `/ProductosRecuperados/RegistrarManual` | Alta manual |
| DELETE | `/ProductosRecuperados/EliminarManual?id=` | Solo movimientos MANUAL |

DI en `Program.cs`: `IInventarioRecuperadoRepository`, `IProductosRecuperadosRepository`, services.

---

## 4. Frontend — Entregas (Nuevo/Modif)

### Archivos

| Archivo | Rol |
|---------|-----|
| `Views/ClientesEntregas/NuevoModif.cshtml` | Tabs: Datos · Productos · **Productos recuperados** · Cobros |
| `wwwroot/js/ClientesEntregasNuevoModif.js` | Lógica dual de líneas |
| `wwwroot/css/ClientesEntregas.css` | Estilos tabs/recuperados |

### JS — convenciones

```javascript
TIPO_LINEA_ENTREGA = 1
TIPO_LINEA_RETIRO = 2
TIPO_LINEA_RECUPERADO = 3  // solo UI; payload va en LineasRecuperadas
```

- `CM.lineas`: array único en memoria; filtro por tipo para render.
- `lineasProductosOperacion()` → tab Productos (tabla `#tbodyLineasEntrega`, columna Tipo).
- `lineasRecuperadas()` → tab Recuperados (`#tbodyLineasRecuperados`, sin columna Tipo).
- `obtenerPayload()` envía **`Lineas`** y **`LineasRecuperadas`** por separado.
- `cargarEntrega()` merge: `d.Lineas` + `d.LineasRecuperadas`.
- `#alertProductoEntregaRecuperado`: aviso amarillo si mismo producto en ambas secciones.

### Cache busting

Todas las vistas usan **`?v=5.0`**. Al cambiar un JS/CSS, subir versión del archivo tocado (ej. `5.1`), no fechas largas.

Entregas NuevoModif (referencia):

- `ClientesEntregasNuevoModif.js?v=5.0`
- `ClientesEntregas.css?v=5.0`

---

## 5. Frontend — Productos recuperados (dashboard)

| Archivo | Rol |
|---------|-----|
| `Views/ProductosRecuperados/Index.cshtml` | KPIs, stock cards, acordeones ranking/historial |
| `wwwroot/js/ProductosRecuperados.js` | Sin DataTables; cards + filtros |
| `wwwroot/css/ProductosRecuperados.css` | Estilo tipo Ventas/Levels |

Funcionalidades:

- Stock recuperado por sucursal (cards).
- Dashboard: más/menos recuperados, historial.
- Alta manual de recuperado.
- Eliminar solo entradas **MANUAL** (revierte stock).

---

## 6. Navegación

**Productos recuperados** va en el dropdown **Clientes** (no ítem suelto en navbar):

`Views/Shared/Partials/NavBarLogin.cshtml` → sección Entregas → **Productos recuperados** → Stock e historial → `/ProductosRecuperados`

---

## 7. Bugs corregidos en esta sesión

| Problema | Causa | Fix |
|----------|-------|-----|
| Recuperados se guardaban como entrega | `MapLineas`: `tipo is 2 ? 2 : 1` | Tabla separada + mapeo correcto |
| Error EF al guardar tipo 3 | CHECK/BD solo 1 y 2 en `ClientesEntregasProductos` | `ClientesEntregasProductosRecuperados` |
| “No puede repetir el mismo producto…” | Validación trataba 3 como 1 | Validación separada; cruce = warning |
| Nav sin Productos recuperados | Perdido en git checkout | Restaurado bajo Clientes |
| Cache viejo | Versiones desactualizadas | Unificado `?v=5.0` |

---

## 8. Pendiente / próximos pasos

### Alta prioridad

1. **Ejecutar SQL** `docs/sql/ClientesEntregasProductosRecuperados.sql` en la BD de cada ambiente.
2. Verificar que existan tablas **`InventarioRecuperado`** e **`InventarioRecuperadoMovimiento`** en BD.
3. Probar ciclo completo: entrega con productos + recuperados → guardar → reabrir → stock en pantalla Productos recuperados.

### Inventario (pantalla `/Inventario`)

El usuario pidió ver stock recuperado **también en Inventario** (junto al stock vendible). Eso **aún no está implementado** en:

- `Views/Inventario/Index.cshtml`
- `wwwroot/js/Inventario.js` (solo filtro de grilla “Producto recuperado” en tipos; sin columna stock recuperado en lista)

**Propuesta para implementar:**

- En `ListaProductos` (controller/service) incluir `StockRecuperado` join a `InventarioRecuperados`.
- En `renderProductosInv()` mostrar segunda línea: “Recuperado: X”.
- Opcional: KPI o sección inferior con link a `/ProductosRecuperados`.

### Datos legacy

- Entregas guardadas antes del fix pueden tener recuperados mal como tipo 1 en `ClientesEntregasProductos`. El script SQL migra tipo 3; revisar manualmente entregas sospechosas.
- Líneas históricas tipo 2 que en realidad eran “recuperado” (confusión retiro/recuperado) **no** se migran automáticamente.

### Mejoras opcionales

- Permiso/nav `seccionProductosRecuperados` si se activan permisos reales en `Permisos.js`.
- Commit de todo el circuito (mucho código está untracked según git status inicial).

---

## 9. Checklist de prueba manual

- [ ] Nueva entrega: solo productos entrega → stock vendible baja.
- [ ] Nueva entrega: solo retiro → stock vendible sube.
- [ ] Nueva entrega: solo recuperados → stock recuperado sube; total $ entrega = 0 por esas líneas.
- [ ] Misma caja en entrega y recuperado → guarda OK + cartel amarillo.
- [ ] Editar entrega: cambiar cantidades recuperadas → stock recuperado se revierte y reaplica.
- [ ] Eliminar entrega → revierte ambos stocks.
- [ ] Productos recuperados: alta manual + eliminar manual.
- [ ] Nav: Clientes → Productos recuperados abre dashboard.

---

## 10. Mapa de archivos tocados

```
docs/sql/ClientesEntregasProductosRecuperados.sql
docs/MANUAL_PRODUCTOS_RECUPERADOS_ENTREGAS.md   ← este archivo

SistemaOroAmbiental.Models/
  ClientesEntregasProductosRecuperado.cs
  InventarioRecuperado.cs
  InventarioRecuperadoMovimiento.cs
  ProductosRecuperadosDtos.cs

SistemaOroAmbiental.DAL/
  Repository/ClientesEntregasRepository.cs
  Repository/InventarioRecuperadoRepository.cs
  Repository/ProductosRecuperadosRepository.cs
  DataContext/SistemaOroAmbientalContext.cs

SistemaOroAmbiental.BLL/
  Service/ClientesEntregasService.cs
  Service/ProductosRecuperadosService.cs

SistemaOroAmbiental.Application/
  Controllers/ClientesEntregasController.cs
  Controllers/ProductosRecuperadosController.cs
  Models/ViewModels/VMClienteEntrega.cs
  Models/ViewModels/VMProductosRecuperados.cs
  Views/ClientesEntregas/NuevoModif.cshtml
  Views/ProductosRecuperados/Index.cshtml
  Views/Shared/Partials/NavBarLogin.cshtml
  wwwroot/js/ClientesEntregasNuevoModif.js
  wwwroot/js/ProductosRecuperados.js
  wwwroot/css/ClientesEntregas.css
  wwwroot/css/ProductosRecuperados.css
  Program.cs
```

---

## 11. Referencias cruzadas

- Contexto general del proyecto: `docs/CONTEXTO_AGENTE.md`
- Patrón UI similar: repo `Sistema-Levels` (Ventas, filtros colapsables, cards)

---

*Actualizar este manual al cerrar cada sesión relevante (fecha + bullet en sección 8).*
