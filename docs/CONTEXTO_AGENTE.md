# Contexto de trabajo — Sistema Oro Ambiental

> Documento para retomar el trabajo con el agente de Cursor.  
> Última actualización: **21 may 2026**  
> Repositorio: `C:\Users\Luciano\source\repos\Sistema-OroAmbiental`  
> Referencia similar: `Sistema-Levels` (mismo patrón MVC + BLL + DAL)

---

## Cómo retomar con el agente

1. Abrí este repo en Cursor y mencioná: *“Leé `docs/CONTEXTO_AGENTE.md` y continuá desde ahí”*.
2. Transcript de la conversación principal (eliminación / cascada / proveedores):  
   [88084e99-d2f8-4769-91f8-1ae2b220282e](88084e99-d2f8-4769-91f8-1ae2b220282e)
3. Stack: **ASP.NET Core 6**, EF Core, SQL Server, jQuery, DataTables, Bootstrap modals.

---

## Arquitectura rápida

| Capa | Proyecto | Rol |
|------|----------|-----|
| UI | `SistemaOroAmbiental.Application` | Controllers, Views, `wwwroot/js`, `site.js` |
| Negocio | `SistemaOroAmbiental.BLL` | Services, `DeleteOperationHelper`, `ServiceResult` |
| Datos | `SistemaOroAmbiental.DAL` | Repositories, `DeleteConflictChecker`, `EntidadCascadeRepository` |
| Modelos | `SistemaOroAmbiental.Models` | Entidades, DTOs (`DependenciasEliminacionInfo`) |

**DI relevante** (`Program.cs`):

- `IDeleteConflictChecker` → `DeleteConflictChecker`
- `IEntidadCascadeRepository` → `EntidadCascadeRepository`

**JSON API:** `PropertyNamingPolicy = null` → respuestas en **PascalCase** (`Items`, `Mensaje`, `Valor`). El JS en `site.js` lee ambos casos (`items` / `Items`).

---

## 1. Eliminación con mensajes claros (todos los módulos)

### Problema original

- Al eliminar (compras, productos, clientes, proveedores, etc.) aparecía *“No se encontró el registro”* o mensajes genéricos.
- Repositorios devolvían `false` en `catch` sin relanzar → el BLL no podía mapear FK ni `InvalidOperationException`.

### Solución

| Pieza | Archivo |
|-------|---------|
| Wrapper de eliminación | `SistemaOroAmbiental.BLL/Common/DeleteOperationHelper.cs` |
| Pre-chequeo por conteos | `SistemaOroAmbiental.DAL/Repository/DeleteConflictChecker.cs` |
| Mensajes FK SQL | `MapDbUpdate` / `MapDbUpdateMessage` en `DeleteOperationHelper` |

**Servicios que usan `DeleteOperationHelper`:** Clientes, Proveedores, Productos, Compras, Contratos, Entregas, Establecimientos, Inventario, Cajas, catálogos (`ConfiguracionNombreService`), etc.

**Repositorios corregidos** (re-lanzan `DbUpdateException` en `Eliminar`): entre otros `ComprasRepository`, `ClientesRepository`, `ProveedoresRepository`, `ProductosRepository`, `ClientesEntregasRepository`, `InventarioRepository`, `CajasRepository`.

### Mensajes FK mapeados (proveedor)

- `ProveedoresPagos` → pagos al proveedor
- `ProveedoresCuentaCorriente` → movimientos / cuenta corriente del proveedor

---

## 2. Compras — eliminación en cascada en servidor

**Causa típica de error genérico:** `ProductosCostoHistorial` con FK a `Compras`.

`ComprasRepository.Eliminar` elimina en orden (aprox.):

1. Pagos / stock / costos / CC compra  
2. **Historial de costos** (`ProductosCostoHistorial`)  
3. Pagos residuales, etc.

Mensajes específicos en `DescribirErrorEliminacionCompra` dentro del repositorio.

---

## 3. Clientes y Proveedores — dependencias + eliminar en cascada

### Pedido de negocio

Al eliminar cliente o proveedor:

1. Mostrar **todo lo asociado**.
2. Opción **eliminar en cascada** (borrar todo) o **pasos manuales**.

### Modelos

- `SistemaOroAmbiental.Models/DependenciasEliminacionInfo.cs`
- `DependenciaEliminacionItem` (Clave, Etiqueta, Cantidad, AccionManual)

### DAL — cascada

- `IEntidadCascadeRepository.cs`
- `EntidadCascadeRepository.cs`

**Cliente — orden cascada:**

1. Entregas  
2. Contratos (documentos, renovaciones)  
3. Establecimientos  
4. Contactos  
5. Cuenta corriente (cobros, movimientos, caja)  
6. Cliente  

**Proveedor — orden cascada:**

1. Compras (`ComprasRepository.Eliminar` por cada compra)  
2. Cuenta corriente proveedor (movimientos PAGO / AJUSTE / COMPRA, pagos sueltos, caja)  
3. Proveedor  

**Fix importante proveedor (may 2026):**

- Si existía fila en `ProveedoresCuentaCorrientes` **sin movimientos contados**, `DependenciasEliminar` devolvía vacío → el usuario veía error FK sin modal.
- **Corrección:** detectar cuenta corriente aunque `movCc == 0`; contar movimientos con join por `IdProveedor`; cascada con transacción y borrado inline de CC (sin depender solo de `EliminarSinTransaccion`).

### BLL

- `ClientesService.Eliminar(id, cascada)`  
- `ProveedoresService.Eliminar(id, cascada)`  
- Si hay dependencias y `cascada == false` → `ServiceResult` con `Tipo = "dependencias"`, `Dependencias`, `InstruccionesPasoAPaso`.

### API

| Módulo | GET dependencias | DELETE |
|--------|------------------|--------|
| Clientes | `/Clientes/DependenciasEliminar?id=` | `/Clientes/Eliminar?id=&cascada=true\|false` |
| Proveedores | `/Proveedores/DependenciasEliminar?id=` | `/Proveedores/Eliminar?id=&cascada=true\|false` |

### UI

| Archivo | Rol |
|---------|-----|
| `Views/Utils/Modals.cshtml` | `#modalEliminarCascada` |
| `wwwroot/js/site.js` | `ejecutarEliminacionEntidad(opts)` |
| `wwwroot/js/Entities/M_Clientes.js` | `eliminar()` → flujo cascada |
| `wwwroot/js/Entities/M_Proveedores.js` | igual |
| `wwwroot/js/Proveedores.js` | grilla → `eliminarProveedor` |

**Flujo JS (`ejecutarEliminacionEntidad`):**

1. GET dependencias  
2. Si `items.length === 0` → confirmación simple → DELETE sin cascada  
3. Si hay items → modal: **Eliminar todo** / **Ver pasos manuales** / cancelar  
4. Cascada → confirmación fuerte → DELETE `cascada=true`

**Versiones cache (Proveedores):**

- `M_Proveedores.js?v=1.4` en `Views/Proveedores/Index.cshtml`
- `Proveedores.js?v=1.1`

**Modales globales:** incluidos vía `Views/Shared/Partials/NavBarLogin.cshtml` → partial `Modals.cshtml`.

---

## 4. Clientes — error no visible en UI

**Problema:** error de eliminación iba a `#errorCampos` dentro del modal cerrado.

**Fix:** `M_Clientes.js` usa `errorModal()` cuando falla (como productos). Versión cache: `M_Clientes.js?v=1.8` (verificar en vista Clientes).

---

## 5. Pantallas rotas — sintaxis JS

**Error:** `SyntaxError: missing ) after argument list`

**Causa:** mezcla ilegal `??` y `||`, ej. `data?.tipo ?? data?.Tipo || "error"`.

**Fix:** solo `??`, ej. `data?.tipo ?? data?.Tipo ?? "error"`.

Archivos tocados: `M_Clientes.js`, `M_ClientesEstablecimientos.js`, `M_Contratos.js` (actualizar `?v=` en vistas al cambiar).

---

## 6. Módulo Gastos (sesión previa en todo list)

Trabajo registrado como completado en agente:

- `IGastosRepository` / `GastosRepository` (caja)  
- VMs + `GastosController` + DI  
- `Views/Gastos/Index.cshtml`, `Gastos.css`  
- `wwwroot/js/Gastos.js`  
- NavBar Gastos  

*(Detalle de archivos: buscar `Gastos` en el repo si se retoma ese módulo.)*

---

## 7. Otros módulos / catálogos migrados

Muchos controllers/services/repos nuevos en git status (sin commit aún): Bancos, CondicionesIva, Productos, ListasPrecios, Sucursales, Roles, etc. Patrón: `ConfiguracionNombreControllerBase` + `CatalogosService` donde aplique.

**Cliente completo:** `ClientesController`, `VMCliente`, vistas `Clientes/Index`, `M_Clientes`, permisos en navbar.

---

## Archivos clave (mapa rápido)

```
SistemaOroAmbiental.BLL/
  Common/DeleteOperationHelper.cs
  Service/ClientesService.cs
  Service/ProveedoresService.cs
  Service/ComprasService.cs
  Service/ProductosService.cs

SistemaOroAmbiental.DAL/Repository/
  EntidadCascadeRepository.cs
  IEntidadCascadeRepository.cs
  DeleteConflictChecker.cs
  ComprasRepository.cs
  ProveedoresCuentaCorrienteRepository.cs  (TIPO_PAGO_PROVEEDOR, TIPO_AJUSTE, TIPO_COMPRA)
  ProveedoresRepository.cs
  ClientesRepository.cs

SistemaOroAmbiental.Models/
  DependenciasEliminacionInfo.cs

SistemaOroAmbiental.Application/
  Program.cs
  Controllers/ClientesController.cs
  Controllers/ProveedoresController.cs
  Views/Utils/Modals.cshtml
  Views/Proveedores/Index.cshtml
  wwwroot/js/site.js
  wwwroot/js/Entities/M_Clientes.js
  wwwroot/js/Entities/M_Proveedores.js
  wwwroot/js/Proveedores.js
```

---

## Pendiente / no hecho

- [ ] **Commit git** — usuario no lo pidió; hay muchos archivos `??` (incl. `bin/`, `obj/` — conviene `.gitignore` antes de commitear).
- [ ] Script SQL permisos / dashboard / login redirect (mencionado en conversaciones previas).
- [ ] Confirmar end-to-end **Proveedores** tras reiniciar app (build bloqueado si VS/app está corriendo).
- [ ] Alinear **Clientes** con el mismo fix de “cuenta corriente vacía” si aplica (`ObtenerDependenciasClienteAsync` solo cuenta movimientos si existe CC con movs).
- [ ] Módulos sin cascada UI: solo mensaje `dependencias` si el front no usa `ejecutarEliminacionEntidad`.

---

## Pruebas sugeridas (Proveedores)

1. Proveedor con solo cuenta corriente creada (pago/ajuste) y sin compras.  
2. Eliminar → debe aparecer modal con “Cuenta corriente” o “Movimientos en cuenta corriente”.  
3. **Eliminar todo en cascada** → éxito y grilla actualizada.  
4. Ctrl+F5 si no aparece el modal (cache `site.js` / `M_Proveedores.js`).

---

## Convenciones del equipo / agente

- Respuestas API: PascalCase; JS defensivo con `??` para ambos casos.  
- No commitear sin pedido explícito del usuario.  
- Cambios mínimos; seguir estilo existente de Levels/Oro Ambiental.  
- Errores de eliminación en grilla: usar `errorModal()`, no `#errorCampos` del modal cerrado.

---

## Historial de cambios en este documento

| Fecha | Notas |
|-------|--------|
| 2026-05-21 | Creación: resumen eliminación, cascada clientes/proveedores, compras, JS, gastos, pendientes, transcript id |

---

*Para ampliar este doc: copiar aquí resultados de nuevas sesiones o enlazar PR/commits cuando existan.*
