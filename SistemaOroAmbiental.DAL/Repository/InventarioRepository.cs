using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class InventarioRepository : IInventarioRepository
    {
        public const string TIPO_ENTRADA_MANUAL = "ENTRADA MANUAL";
        public const string TIPO_SALIDA_MANUAL = "SALIDA MANUAL";
        public const string TIPO_AJUSTE = "AJUSTE";
        public const string TIPO_TRANSFERENCIA = "TRANSFERENCIA";
        public const string TIPO_COMPRA = "COMPRA";
        public const string TIPO_ENTREGA = "ENTREGA";

        private readonly SistemaOroAmbientalContext _db;

        public InventarioRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<(Producto producto, Inventario? inventario)>> ListarProductos(
            int idSucursal,
            string? buscar,
            bool soloBajoMinimo,
            int? idCategoria)
        {
            var query = _db.Productos
                .AsNoTracking()
                .Include(p => p.IdCategoriaNavigation)
                .Include(p => p.IdMedidaNavigation)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(buscar))
                query = query.Where(p => p.Nombre.Contains(buscar));

            if (idCategoria.HasValue)
                query = query.Where(p => p.IdCategoria == idCategoria.Value);

            var productos = await query.OrderBy(p => p.Nombre).ToListAsync();

            var inventarios = await _db.Inventarios
                .AsNoTracking()
                .Where(x => x.IdSucursal == idSucursal)
                .ToDictionaryAsync(x => x.IdProducto);

            var lista = productos
                .Select(p => (
                    producto: p,
                    inventario: inventarios.TryGetValue(p.Id, out var inv) ? inv : null
                ))
                .ToList();

            if (soloBajoMinimo)
            {
                lista = lista.Where(x =>
                {
                    var stock = x.inventario?.Stock ?? 0;
                    return x.producto.StockMinimo > 0 && stock < x.producto.StockMinimo;
                }).ToList();
            }

            return lista;
        }

        public async Task<Inventario> ObtenerOCrearInventario(int idSucursal, int idProducto)
        {
            var inv = await _db.Inventarios
                .FirstOrDefaultAsync(x => x.IdSucursal == idSucursal && x.IdProducto == idProducto);

            if (inv != null)
                return inv;

            inv = new Inventario
            {
                IdSucursal = idSucursal,
                IdProducto = idProducto,
                Stock = 0
            };

            _db.Inventarios.Add(inv);
            await _db.SaveChangesAsync();
            return inv;
        }

        private IQueryable<InventarioMovimiento> QueryMovimientosProducto(int idSucursal, int idProducto)
            => _db.InventarioMovimientos
                .AsNoTracking()
                .Include(x => x.IdInventarioNavigation)
                    .ThenInclude(i => i.IdProductoNavigation)
                .Include(x => x.IdInventarioNavigation)
                    .ThenInclude(i => i.IdSucursalNavigation)
                .Where(x =>
                    x.IdInventarioNavigation.IdSucursal == idSucursal &&
                    x.IdInventarioNavigation.IdProducto == idProducto);

        private static IQueryable<InventarioMovimiento> AplicarFiltroTipo(
            IQueryable<InventarioMovimiento> query,
            string? tipoMovimiento)
        {
            if (string.IsNullOrWhiteSpace(tipoMovimiento))
                return query;

            var t = tipoMovimiento.Trim().ToUpperInvariant();

            return t switch
            {
                "ENTRADA" => query.Where(x =>
                    x.TipoMovimiento == TIPO_ENTRADA_MANUAL ||
                    x.TipoMovimiento == TIPO_COMPRA ||
                    (x.TipoMovimiento == TIPO_TRANSFERENCIA && x.Entrada > 0)),
                "SALIDA" => query.Where(x =>
                    x.TipoMovimiento == TIPO_SALIDA_MANUAL ||
                    x.TipoMovimiento == TIPO_ENTREGA ||
                    (x.TipoMovimiento == TIPO_TRANSFERENCIA && x.Salida > 0)),
                "AJUSTE" => query.Where(x => x.TipoMovimiento == TIPO_AJUSTE),
                "TRANSFERENCIA" => query.Where(x => x.TipoMovimiento == TIPO_TRANSFERENCIA),
                "COMPRA" => query.Where(x => x.TipoMovimiento == TIPO_COMPRA),
                "ENTREGA" => query.Where(x => x.TipoMovimiento == TIPO_ENTREGA),
                _ => query.Where(x => x.TipoMovimiento == tipoMovimiento)
            };
        }

        private IQueryable<InventarioMovimiento> AplicarFiltros(
            IQueryable<InventarioMovimiento> query,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            if (fechaDesde.HasValue)
                query = query.Where(x => x.Fecha >= fechaDesde.Value.Date);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(x => x.Fecha <= hasta);
            }

            query = AplicarFiltroTipo(query, tipoMovimiento);

            if (!string.IsNullOrWhiteSpace(texto))
                query = query.Where(x => x.Concepto.Contains(texto));

            return query;
        }

        public async Task<List<InventarioMovimiento>> Movimientos(
            int idSucursal,
            int idProducto,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            var query = AplicarFiltros(
                QueryMovimientosProducto(idSucursal, idProducto),
                fechaDesde,
                fechaHasta,
                tipoMovimiento,
                texto);

            return await query
                .OrderBy(x => x.Fecha)
                .ThenBy(x => x.Id)
                .ToListAsync();
        }

        public async Task<decimal> StockAnterior(int idSucursal, int idProducto, DateTime? fechaDesde)
        {
            if (!fechaDesde.HasValue)
                return 0;

            return await QueryMovimientosProducto(idSucursal, idProducto)
                .Where(x => x.Fecha < fechaDesde.Value.Date)
                .SumAsync(x => x.Entrada - x.Salida);
        }

        public async Task<(decimal entradas, decimal salidas, int cantidad)> Resumen(
            int idSucursal,
            int idProducto,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            var query = AplicarFiltros(
                QueryMovimientosProducto(idSucursal, idProducto),
                fechaDesde,
                fechaHasta,
                tipoMovimiento,
                texto);

            var entradas = await query.SumAsync(x => x.Entrada);
            var salidas = await query.SumAsync(x => x.Salida);
            var cantidad = await query.CountAsync();

            return (entradas, salidas, cantidad);
        }

        public async Task<(InventarioMovimiento? mov, decimal stock)> ObtenerMovimiento(int id)
        {
            var mov = await _db.InventarioMovimientos
                .AsNoTracking()
                .Include(x => x.IdInventarioNavigation)
                    .ThenInclude(i => i.IdProductoNavigation)
                .Include(x => x.IdInventarioNavigation)
                    .ThenInclude(i => i.IdSucursalNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (mov == null)
                return (null, 0);

            var idSucursal = mov.IdInventarioNavigation.IdSucursal;
            var idProducto = mov.IdInventarioNavigation.IdProducto;

            var stock = await _db.InventarioMovimientos
                .Where(x =>
                    x.IdInventarioNavigation.IdSucursal == idSucursal &&
                    x.IdInventarioNavigation.IdProducto == idProducto)
                .Where(x =>
                    x.Fecha < mov.Fecha ||
                    (x.Fecha == mov.Fecha && x.Id <= mov.Id))
                .SumAsync(x => x.Entrada - x.Salida);

            return (mov, stock);
        }

        public async Task<(InventarioMovimiento? salida, InventarioMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo)
        {
            var movimientos = await _db.InventarioMovimientos
                .AsNoTracking()
                .Include(x => x.IdInventarioNavigation)
                    .ThenInclude(i => i.IdSucursalNavigation)
                .Where(x => x.TipoMovimiento == TIPO_TRANSFERENCIA && x.IdMovimiento == idMovimientoGrupo)
                .OrderBy(x => x.Id)
                .ToListAsync();

            var salida = movimientos.FirstOrDefault(x => x.Salida > 0);
            var entrada = movimientos.FirstOrDefault(x => x.Entrada > 0);

            return (salida, entrada);
        }

        private async Task<bool> RegistrarMovimiento(
            Inventario inventario,
            string tipoMovimiento,
            DateTime fecha,
            string concepto,
            decimal entrada,
            decimal salida,
            int idMovimientoRef,
            int idUsuario)
        {
            var ahora = DateTime.Now;

            var mov = new InventarioMovimiento
            {
                IdInventario = inventario.Id,
                TipoMovimiento = tipoMovimiento,
                IdMovimiento = idMovimientoRef,
                Fecha = fecha,
                Concepto = concepto,
                Entrada = entrada,
                Salida = salida,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.InventarioMovimientos.Add(mov);
            inventario.Stock += entrada - salida;

            await _db.SaveChangesAsync();

            if (idMovimientoRef == 0 && tipoMovimiento is TIPO_ENTRADA_MANUAL or TIPO_SALIDA_MANUAL or TIPO_AJUSTE)
            {
                mov.IdMovimiento = mov.Id;
                await _db.SaveChangesAsync();
            }

            return true;
        }

        public async Task<bool> RegistrarEntradaManual(
            int idSucursal,
            int idProducto,
            DateTime fecha,
            string concepto,
            decimal cantidad,
            int idUsuario)
        {
            if (cantidad <= 0) return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var inv = await ObtenerOCrearInventario(idSucursal, idProducto);
                await RegistrarMovimiento(inv, TIPO_ENTRADA_MANUAL, fecha, concepto, cantidad, 0, 0, idUsuario);
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RegistrarSalidaManual(
            int idSucursal,
            int idProducto,
            DateTime fecha,
            string concepto,
            decimal cantidad,
            int idUsuario)
        {
            if (cantidad <= 0) return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var inv = await ObtenerOCrearInventario(idSucursal, idProducto);
                if (inv.Stock < cantidad)
                    return false;

                await RegistrarMovimiento(inv, TIPO_SALIDA_MANUAL, fecha, concepto, 0, cantidad, 0, idUsuario);
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RegistrarAjuste(
            int idSucursal,
            int idProducto,
            DateTime fecha,
            string concepto,
            decimal entrada,
            decimal salida,
            int idUsuario)
        {
            if (entrada <= 0 && salida <= 0) return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var inv = await ObtenerOCrearInventario(idSucursal, idProducto);
                if (salida > 0 && inv.Stock < salida)
                    return false;

                await RegistrarMovimiento(inv, TIPO_AJUSTE, fecha, concepto, entrada, salida, 0, idUsuario);
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RegistrarTransferencia(
            DateTime fecha,
            int idSucursalOrigen,
            int idProducto,
            int idSucursalDestino,
            decimal cantidad,
            string notaInterna,
            int idUsuario)
        {
            if (cantidad <= 0 || idSucursalOrigen == idSucursalDestino)
                return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var invOrigen = await ObtenerOCrearInventario(idSucursalOrigen, idProducto);
                if (invOrigen.Stock < cantidad)
                    return false;

                var invDestino = await ObtenerOCrearInventario(idSucursalDestino, idProducto);
                var ahora = DateTime.Now;
                var nota = (notaInterna ?? "").Trim();
                var conceptoBase = string.IsNullOrEmpty(nota) ? "Transferencia entre sucursales" : nota;

                var salida = new InventarioMovimiento
                {
                    IdInventario = invOrigen.Id,
                    TipoMovimiento = TIPO_TRANSFERENCIA,
                    IdMovimiento = 0,
                    Fecha = fecha,
                    Concepto = $"Transferencia salida - {conceptoBase}",
                    Entrada = 0,
                    Salida = cantidad,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.InventarioMovimientos.Add(salida);
                invOrigen.Stock -= cantidad;
                await _db.SaveChangesAsync();

                salida.IdMovimiento = salida.Id;

                var entrada = new InventarioMovimiento
                {
                    IdInventario = invDestino.Id,
                    TipoMovimiento = TIPO_TRANSFERENCIA,
                    IdMovimiento = salida.Id,
                    Fecha = fecha,
                    Concepto = $"Transferencia entrada - {conceptoBase}",
                    Entrada = cantidad,
                    Salida = 0,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.InventarioMovimientos.Add(entrada);
                invDestino.Stock += cantidad;

                await _db.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> Eliminar(int idMovimiento)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.InventarioMovimientos
                    .Include(x => x.IdInventarioNavigation)
                    .FirstOrDefaultAsync(x => x.Id == idMovimiento);

                if (mov == null)
                    return false;

                var editable = mov.TipoMovimiento is TIPO_ENTRADA_MANUAL or TIPO_SALIDA_MANUAL or TIPO_AJUSTE or TIPO_TRANSFERENCIA;
                if (!editable)
                {
                    throw new InvalidOperationException(
                        "No se pudo eliminar este movimiento. Solo se pueden eliminar movimientos manuales, ajustes o transferencias.");
                }

                if (mov.TipoMovimiento == TIPO_TRANSFERENCIA)
                {
                    var idGrupo = mov.Salida > 0 ? mov.Id : mov.IdMovimiento;

                    var movimientos = await _db.InventarioMovimientos
                        .Include(x => x.IdInventarioNavigation)
                        .Where(x =>
                            x.TipoMovimiento == TIPO_TRANSFERENCIA &&
                            (x.Id == idGrupo || x.IdMovimiento == idGrupo))
                        .ToListAsync();

                    foreach (var m in movimientos)
                    {
                        m.IdInventarioNavigation.Stock -= (m.Entrada - m.Salida);
                        _db.InventarioMovimientos.Remove(m);
                    }
                }
                else
                {
                    mov.IdInventarioNavigation.Stock -= (mov.Entrada - mov.Salida);
                    _db.InventarioMovimientos.Remove(mov);
                }

                await _db.SaveChangesAsync();
                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }
    }
}
