using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public partial class EntidadCascadeRepository
    {
        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasProductoAsync(int idProducto)
        {
            var items = new List<DependenciaEliminacionItem>();

            var compras = await _db.ComprasProductos
                .Where(x => x.IdProducto == idProducto)
                .Select(x => x.IdCompra)
                .Distinct()
                .CountAsync();
            if (compras > 0)
                items.Add(Item("compras", "Compras que incluyen este producto", compras,
                    "Eliminá esas compras desde el módulo Compras (se revierte stock y cuenta corriente)."));

            var entregas = await _db.ClientesEntregasProductos
                .Where(x => x.IdProducto == idProducto)
                .Select(x => x.IdEntrega)
                .Distinct()
                .CountAsync();
            var entregasRec = await _db.ClientesEntregasProductosRecuperados
                .Where(x => x.IdProducto == idProducto)
                .Select(x => x.IdEntrega)
                .Distinct()
                .CountAsync();
            var entregasTotal = Math.Max(entregas, entregasRec);
            if (entregasTotal > 0)
                items.Add(Item("entregas", "Entregas que incluyen este producto", entregasTotal,
                    "Eliminá esas entregas desde Entregas (se revierte stock y cuenta corriente)."));

            var est = await _db.ClientesEstablecimientosProductos.CountAsync(x => x.IdProducto == idProducto);
            if (est > 0)
                items.Add(Item("establecimientos", "Asignaciones en establecimientos", est,
                    "Quitá el producto de cada establecimiento."));

            var precios = await _db.ProductosPrecios.CountAsync(x => x.IdProducto == idProducto);
            if (precios > 0)
                items.Add(Item("precios", "Precios en listas", precios,
                    "Eliminá los precios desde Lista de precios."));

            var listasEsp = await _db.ListasPrecios.CountAsync(x => x.IdProducto == idProducto);
            if (listasEsp > 0)
                items.Add(Item("listasProducto", "Listas de precio de este producto", listasEsp,
                    "Se eliminan las listas exclusivas de este producto (no las generales)."));

            var inv = await _db.Inventarios.CountAsync(x => x.IdProducto == idProducto);
            if (inv > 0)
                items.Add(Item("inventario", "Saldos de inventario", inv,
                    "Los movimientos de inventario de este producto se eliminan en cascada."));

            var rec = await _db.InventarioRecuperados.CountAsync(x => x.IdProducto == idProducto);
            if (rec > 0)
                items.Add(Item("recuperado", "Stock recuperado", rec,
                    "El stock recuperado de este producto se elimina en cascada."));

            var hist = await _db.ProductosCostoHistorials.CountAsync(x => x.IdProducto == idProducto);
            if (hist > 0)
                items.Add(Item("historial", "Historial de costos", hist,
                    "El historial de costos se elimina en cascada."));

            var ldMov = await _db.LibroDiarioMovimientos.CountAsync(x => x.IdProducto == idProducto);
            if (ldMov > 0)
                items.Add(Item("libroDiario", "Movimientos de libro diario", ldMov,
                    "Se desvincula el producto de esos movimientos (no se borran)."));

            var ldConc = await _db.LibroDiarioConceptos.CountAsync(x => x.IdProducto == idProducto);
            if (ldConc > 0)
                items.Add(Item("libroConceptos", "Conceptos de libro diario", ldConc,
                    "Se desvincula el producto de esos conceptos (no se borran)."));

            return ArmarInfo("este producto", items);
        }

        public Task EliminarProductoEnCascadaAsync(int idProducto)
            => _db.ExecuteInTransactionAsync(async () =>
            {
                var idsCompras = await _db.ComprasProductos
                    .Where(x => x.IdProducto == idProducto)
                    .Select(x => x.IdCompra)
                    .Distinct()
                    .ToListAsync();

                foreach (var idCompra in idsCompras)
                {
                    if (!await _comprasRepo.EliminarSinTransaccion(idCompra))
                        throw new InvalidOperationException($"No se pudo eliminar la compra #{idCompra}.");
                }

                var idsEntregas = await _db.ClientesEntregasProductos
                    .Where(x => x.IdProducto == idProducto)
                    .Select(x => x.IdEntrega)
                    .Distinct()
                    .ToListAsync();

                var idsEntregasRec = await _db.ClientesEntregasProductosRecuperados
                    .Where(x => x.IdProducto == idProducto)
                    .Select(x => x.IdEntrega)
                    .Distinct()
                    .ToListAsync();

                foreach (var idEntrega in idsEntregas.Union(idsEntregasRec).Distinct())
                {
                    if (!await _entregasRepo.EliminarSinTransaccion(idEntrega))
                        throw new InvalidOperationException($"No se pudo eliminar la entrega #{idEntrega}.");
                }

                var asignaciones = await _db.ClientesEstablecimientosProductos
                    .Where(x => x.IdProducto == idProducto)
                    .ToListAsync();
                _db.ClientesEstablecimientosProductos.RemoveRange(asignaciones);

                var ldMovs = await _db.LibroDiarioMovimientos
                    .Where(x => x.IdProducto == idProducto)
                    .ToListAsync();
                foreach (var m in ldMovs)
                    m.IdProducto = null;

                var ldConc = await _db.LibroDiarioConceptos
                    .Where(x => x.IdProducto == idProducto)
                    .ToListAsync();
                foreach (var c in ldConc)
                    c.IdProducto = null;

                var idsRec = await _db.InventarioRecuperados
                    .Where(x => x.IdProducto == idProducto)
                    .Select(x => x.Id)
                    .ToListAsync();
                if (idsRec.Count > 0)
                {
                    var movRec = await _db.InventarioRecuperadoMovimientos
                        .Where(x => idsRec.Contains(x.IdInventarioRecuperado))
                        .ToListAsync();
                    _db.InventarioRecuperadoMovimientos.RemoveRange(movRec);
                    var recs = await _db.InventarioRecuperados
                        .Where(x => x.IdProducto == idProducto)
                        .ToListAsync();
                    _db.InventarioRecuperados.RemoveRange(recs);
                }

                var idsInventario = await _db.Inventarios
                    .Where(x => x.IdProducto == idProducto)
                    .Select(x => x.Id)
                    .ToListAsync();
                if (idsInventario.Count > 0)
                {
                    var movimientos = await _db.InventarioMovimientos
                        .Where(x => idsInventario.Contains(x.IdInventario))
                        .ToListAsync();
                    _db.InventarioMovimientos.RemoveRange(movimientos);
                    var inventarios = await _db.Inventarios
                        .Where(x => x.IdProducto == idProducto)
                        .ToListAsync();
                    _db.Inventarios.RemoveRange(inventarios);
                }

                var precios = await _db.ProductosPrecios.Where(x => x.IdProducto == idProducto).ToListAsync();
                _db.ProductosPrecios.RemoveRange(precios);

                var listasEsp = await _db.ListasPrecios.Where(x => x.IdProducto == idProducto).ToListAsync();
                foreach (var lista in listasEsp)
                {
                    var idLista = lista.Id;
                    foreach (var e in await _db.ClientesEstablecimientos.Where(x => x.IdListaPrecio == idLista).ToListAsync())
                        e.IdListaPrecio = null;
                    foreach (var p in await _db.ClientesEstablecimientosProductos.Where(x => x.IdListaPrecio == idLista).ToListAsync())
                        p.IdListaPrecio = null;
                    foreach (var p in await _db.ClientesEntregasProductos.Where(x => x.IdListaPrecio == idLista).ToListAsync())
                        p.IdListaPrecio = null;
                    foreach (var p in await _db.ClientesEntregasProductosRecuperados.Where(x => x.IdListaPrecio == idLista).ToListAsync())
                        p.IdListaPrecio = null;
                }
                _db.ListasPrecios.RemoveRange(listasEsp);

                var historial = await _db.ProductosCostoHistorials.Where(x => x.IdProducto == idProducto).ToListAsync();
                _db.ProductosCostoHistorials.RemoveRange(historial);

                await _db.SaveChangesAsync();

                var entity = await _db.Productos.FirstOrDefaultAsync(x => x.Id == idProducto);
                if (entity == null)
                    throw new InvalidOperationException("No se encontró el producto al finalizar la cascada.");

                _db.Productos.Remove(entity);
                await _db.SaveChangesAsync();
            });

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasEstablecimientoAsync(int idEstablecimiento)
        {
            var items = new List<DependenciaEliminacionItem>();

            var contr = await _db.Contratos.CountAsync(x => x.IdEstablecimiento == idEstablecimiento);
            if (contr > 0)
                items.Add(Item("contratos", "Contratos", contr, "Eliminá los contratos de este establecimiento."));

            var ent = await _db.ClientesEntregas.CountAsync(x => x.IdEstablecimiento == idEstablecimiento);
            if (ent > 0)
                items.Add(Item("entregas", "Entregas", ent, "Eliminá las entregas de este establecimiento."));

            var docs = await _db.ContratosDocumentos.CountAsync(d =>
                _db.Contratos.Any(c => c.Id == d.IdContrato && c.IdEstablecimiento == idEstablecimiento));
            if (docs > 0)
                items.Add(Item("documentos", "Documentos de contratos", docs, "Eliminá los archivos desde cada contrato."));

            var prod = await _db.ClientesEstablecimientosProductos.CountAsync(x => x.IdEstablecimiento == idEstablecimiento);
            if (prod > 0)
                items.Add(Item("productos", "Productos asignados", prod, "Quitá los productos del establecimiento."));

            var cont = await _db.ClientesEstablecimientosContactos.CountAsync(x => x.IdEstablecimiento == idEstablecimiento);
            if (cont > 0)
                items.Add(Item("contactos", "Contactos", cont, "Quitá los contactos del establecimiento."));

            var terc = await _db.ClientesEstablecimientosTerceros.CountAsync(x => x.IdEstablecimiento == idEstablecimiento);
            if (terc > 0)
                items.Add(Item("terceros", "Pagadores de terceros", terc, "Quitá los pagadores del establecimiento."));

            var rec = await _db.ClientesRecorridos.CountAsync(x => x.IdEstablecimiento == idEstablecimiento);
            if (rec > 0)
                items.Add(Item("recorridos", "Ocurrencias en recorridos", rec, "Se quitan de la hoja de ruta en cascada."));

            return ArmarInfo("este establecimiento", items);
        }

        public Task EliminarEstablecimientoEnCascadaAsync(int idEstablecimiento)
            => _db.ExecuteInTransactionAsync(async () =>
            {
                var idsContratos = await _db.Contratos
                    .Where(c => c.IdEstablecimiento == idEstablecimiento)
                    .Select(c => c.Id)
                    .ToListAsync();

                var idsEntregas = await _db.ClientesEntregas
                    .Where(e => e.IdEstablecimiento == idEstablecimiento
                        || (e.IdContrato.HasValue && idsContratos.Contains(e.IdContrato.Value)))
                    .Select(e => e.Id)
                    .ToListAsync();

                foreach (var idEntrega in idsEntregas)
                {
                    if (!await _entregasRepo.EliminarSinTransaccion(idEntrega))
                        throw new InvalidOperationException($"No se pudo eliminar la entrega #{idEntrega}.");
                }

                foreach (var idContrato in idsContratos)
                    await EliminarContratoHijosYCabeceraAsync(idContrato);

                if (!await _establecimientosRepo.EliminarSinTransaccion(idEstablecimiento))
                    throw new InvalidOperationException("No se encontró el establecimiento al finalizar la cascada.");
            });

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasContratoAsync(int idContrato)
        {
            var items = new List<DependenciaEliminacionItem>();

            var ent = await _db.ClientesEntregas.CountAsync(x => x.IdContrato == idContrato);
            if (ent > 0)
                items.Add(Item("entregas", "Entregas", ent, "Eliminá las entregas asociadas al contrato."));

            var docs = await _db.ContratosDocumentos.CountAsync(x => x.IdContrato == idContrato);
            if (docs > 0)
                items.Add(Item("documentos", "Documentos adjuntos", docs, "Eliminá los documentos del contrato."));

            var renov = await _db.ContratosRenovaciones.CountAsync(x => x.IdContrato == idContrato);
            if (renov > 0)
                items.Add(Item("renovaciones", "Renovaciones", renov, "Eliminá las renovaciones del contrato."));

            return ArmarInfo("este contrato", items);
        }

        public Task EliminarContratoEnCascadaAsync(int idContrato)
            => _db.ExecuteInTransactionAsync(async () =>
            {
                var idsEntregas = await _db.ClientesEntregas
                    .Where(e => e.IdContrato == idContrato)
                    .Select(e => e.Id)
                    .ToListAsync();

                foreach (var idEntrega in idsEntregas)
                {
                    if (!await _entregasRepo.EliminarSinTransaccion(idEntrega))
                        throw new InvalidOperationException($"No se pudo eliminar la entrega #{idEntrega}.");
                }

                await EliminarContratoHijosYCabeceraAsync(idContrato);
            });

        private async Task EliminarContratoHijosYCabeceraAsync(int idContrato)
        {
            var docs = await _db.ContratosDocumentos.Where(d => d.IdContrato == idContrato).ToListAsync();
            _db.ContratosDocumentos.RemoveRange(docs);

            var renov = await _db.ContratosRenovaciones.Where(r => r.IdContrato == idContrato).ToListAsync();
            _db.ContratosRenovaciones.RemoveRange(renov);
            await _db.SaveChangesAsync();

            if (!await _contratosRepo.EliminarSinTransaccion(idContrato))
                throw new InvalidOperationException($"No se pudo eliminar el contrato #{idContrato}.");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasChoferAsync(int idChofer)
            => Task.FromResult(new DependenciasEliminacionInfo());

        public async Task EliminarChoferEnCascadaAsync(int idChofer)
        {
            if (!await _choferesRepo.Eliminar(idChofer))
                throw new InvalidOperationException("No se encontró el chofer.");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasFirmaAsync(int idFirma)
            => Task.FromResult(new DependenciasEliminacionInfo());

        public async Task EliminarFirmaEnCascadaAsync(int idFirma)
        {
            if (!await _firmasRepo.Eliminar(idFirma))
                throw new InvalidOperationException("No se encontró la firma.");
        }

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasUsuarioAsync(int idUsuario)
        {
            var tablas = await UsuarioDeleteHelper.ListarDependenciasAsync(_db, idUsuario);
            var items = tablas.Select(t =>
            {
                var nombre = UsuarioDeleteHelper.NombreAmigable(t.Table);
                var accion = t.EsPropia
                    ? "Se borran junto con el usuario."
                    : t.RequiereReasignar
                        ? "Hay que pasarlos a otro usuario; no pueden quedar vacíos."
                        : "Se quita el vínculo de este usuario; el registro se mantiene.";
                return Item(t.Table, nombre, t.Cantidad, accion);
            }).ToList();

            var hayOtro = await _db.Usuarios.AnyAsync(x => x.Id != idUsuario);
            var requiere = tablas.Any(t => t.RequiereReasignar);
            var permite = !requiere || hayOtro;

            var info = ArmarInfo("este usuario", items, "desvincular", permite);
            if (!permite)
            {
                info.MensajeResumen =
                    "No se puede eliminar el último usuario del sistema: hay registros de auditoría que deben reasignarse a otro usuario.";
            }

            return info;
        }

        public Task EliminarUsuarioEnCascadaAsync(int idUsuario)
            => _db.ExecuteInTransactionAsync(async () =>
            {
                var tablas = await UsuarioDeleteHelper.ListarDependenciasAsync(_db, idUsuario);
                var idReasignar = await _db.Usuarios
                    .Where(x => x.Id != idUsuario)
                    .OrderBy(x => x.Id)
                    .Select(x => (int?)x.Id)
                    .FirstOrDefaultAsync();

                await UsuarioDeleteHelper.DesvincularAsync(_db, tablas, idUsuario, idReasignar);

                if (!await _usuariosRepo.Eliminar(idUsuario))
                    throw new InvalidOperationException("No se encontró el usuario al finalizar la cascada.");
            });

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasCompraAsync(int idCompra)
        {
            var items = new List<DependenciaEliminacionItem>();

            var lineas = await _db.ComprasProductos.CountAsync(x => x.IdCompra == idCompra);
            if (lineas > 0)
                items.Add(Item("lineas", "Líneas de productos", lineas, "Se revierten del stock al eliminar la compra."));

            var pagos = await _db.ProveedoresPagos.CountAsync(x => x.IdCompra == idCompra);
            if (pagos > 0)
                items.Add(Item("pagos", "Pagos al proveedor", pagos, "Se revierten caja y cuenta corriente."));

            var hist = await _db.ProductosCostoHistorials.CountAsync(x => x.IdCompra == idCompra);
            if (hist > 0)
                items.Add(Item("historial", "Historial de costos", hist, "Se elimina el historial generado por esta compra."));

            return ArmarInfo("esta compra", items);
        }

        public async Task EliminarCompraEnCascadaAsync(int idCompra)
        {
            if (!await _comprasRepo.Eliminar(idCompra))
                throw new InvalidOperationException("No se encontró la compra.");
        }

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasEntregaAsync(int idEntrega)
        {
            var items = new List<DependenciaEliminacionItem>();

            var lineas = await _db.ClientesEntregasProductos.CountAsync(x => x.IdEntrega == idEntrega);
            if (lineas > 0)
                items.Add(Item("lineas", "Líneas de productos", lineas, "Se revierten del stock al eliminar la entrega."));

            var rec = await _db.ClientesEntregasProductosRecuperados.CountAsync(x => x.IdEntrega == idEntrega);
            if (rec > 0)
                items.Add(Item("recuperados", "Productos recuperados", rec, "Se revierten del stock recuperado."));

            var cobros = await _db.ClientesCobros.CountAsync(x => x.IdEntrega == idEntrega);
            if (cobros > 0)
                items.Add(Item("cobros", "Cobros", cobros, "Se revierten caja y cuenta corriente."));

            return ArmarInfo("esta entrega", items);
        }

        public async Task EliminarEntregaEnCascadaAsync(int idEntrega)
        {
            if (!await _entregasRepo.Eliminar(idEntrega))
                throw new InvalidOperationException("No se encontró la entrega.");
        }

        public async Task<DependenciasEliminacionInfo> ObtenerDependenciasGastoAsync(int idGasto)
        {
            var items = new List<DependenciaEliminacionItem>();
            var gasto = await _db.Gastos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == idGasto);
            if (gasto?.IdMovCaja != null)
            {
                items.Add(Item("caja", "Movimiento de caja", 1,
                    "Se revierte el egreso de caja al eliminar el gasto."));
            }

            return ArmarInfo("este gasto", items);
        }

        public async Task EliminarGastoEnCascadaAsync(int idGasto)
        {
            if (!await _gastosRepo.Eliminar(idGasto))
                throw new InvalidOperationException("No se encontró el gasto.");
        }
    }
}
