using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ComprasRepository : IComprasRepository
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IProveedoresCuentaCorrienteRepository _ccRepo;

        public ComprasRepository(
            SistemaOroAmbientalContext context,
            IProveedoresCuentaCorrienteRepository ccRepo)
        {
            _db = context;
            _ccRepo = ccRepo;
        }

        public async Task<List<Compra>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idProveedor,
            int? idSucursal,
            string? texto)
        {
            var query = _db.Compras
                .AsNoTracking()
                .Include(x => x.IdProveedorNavigation)
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.ComprasProductos)
                .AsQueryable();

            if (fechaDesde.HasValue)
                query = query.Where(x => x.Fecha >= fechaDesde.Value.Date);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(x => x.Fecha <= hasta);
            }

            if (idProveedor.HasValue)
                query = query.Where(x => x.IdProveedor == idProveedor.Value);

            if (idSucursal.HasValue)
                query = query.Where(x => x.IdSucursal == idSucursal.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                query = query.Where(x =>
                    (x.NotaInterna != null && x.NotaInterna.Contains(t)) ||
                    x.IdProveedorNavigation.Nombre.Contains(t));
            }

            return await query
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<Compra?> Obtener(int id)
        {
            return await _db.Compras
                .Include(x => x.IdProveedorNavigation)
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.ComprasProductos)
                    .ThenInclude(l => l.IdProductoNavigation)
                        .ThenInclude(p => p.IdMedidaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<bool> TienePagos(int idCompra)
        {
            return await _db.ProveedoresPagos
                .AsNoTracking()
                .AnyAsync(x => x.IdCompra == idCompra);
        }

        public static void RecalcularLinea(ComprasProducto linea)
        {
            var cant = linea.Cantidad;
            if (cant <= 0) cant = 0;

            var costo = linea.CostoUnitario;
            var porcDesc = linea.PorcDescuento;
            var porcIva = linea.PorcIva;

            linea.DescUnitario = Math.Round(costo * porcDesc / 100m, 4);
            linea.DescTotal = Math.Round(linea.DescUnitario * cant, 2);
            linea.CostoUnitCdesc = Math.Round(costo - linea.DescUnitario, 4);
            linea.SubtotalCdesc = Math.Round(linea.CostoUnitCdesc * cant, 2);
            linea.Ivaunitario = Math.Round(linea.CostoUnitCdesc * porcIva / 100m, 4);
            linea.Ivatotal = Math.Round(linea.Ivaunitario * cant, 2);
            linea.CostoUnitFinal = Math.Round(linea.CostoUnitCdesc + linea.Ivaunitario, 4);
            linea.SubtotalFinal = Math.Round(linea.SubtotalCdesc + linea.Ivatotal, 2);
        }

        public static void RecalcularTotalesCompra(Compra compra, IEnumerable<ComprasProducto> lineas)
        {
            var lista = lineas.ToList();
            compra.Subtotal = lista.Sum(x => x.SubtotalCdesc);
            compra.Descuentos = lista.Sum(x => x.DescTotal);
            compra.TotalIva = lista.Sum(x => x.Ivatotal);
            compra.ImporteTotal = lista.Sum(x => x.SubtotalFinal);
        }

        private async Task<Inventario> ObtenerOCrearInventario(int idSucursal, int idProducto)
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

        private async Task<ProveedoresCuentaCorriente> ObtenerOCrearCuentaCorriente(int idProveedor)
        {
            var cc = await _db.ProveedoresCuentaCorrientes
                .FirstOrDefaultAsync(x => x.IdProveedor == idProveedor);

            if (cc != null)
                return cc;

            cc = new ProveedoresCuentaCorriente
            {
                IdProveedor = idProveedor,
                Saldo = 0
            };

            _db.ProveedoresCuentaCorrientes.Add(cc);
            await _db.SaveChangesAsync();
            return cc;
        }

        private async Task RegistrarStockCompra(
            int idCompra,
            int idSucursal,
            DateTime fecha,
            ComprasProducto linea,
            int idUsuario,
            DateTime ahora)
        {
            var inv = await ObtenerOCrearInventario(idSucursal, linea.IdProducto);
            var producto = await _db.Productos.FirstAsync(x => x.Id == linea.IdProducto);

            var mov = new InventarioMovimiento
            {
                IdInventario = inv.Id,
                TipoMovimiento = InventarioRepository.TIPO_COMPRA,
                IdMovimiento = idCompra,
                Fecha = fecha,
                Concepto = $"Compra #{idCompra} - {producto.Nombre}",
                Entrada = linea.Cantidad,
                Salida = 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.InventarioMovimientos.Add(mov);
            inv.Stock += linea.Cantidad;

            await _db.SaveChangesAsync();

            linea.IdInventarioMov = mov.Id;
            linea.CostoUnitarioAnterior = producto.CostoUnitario;

            var costoAntesCompra = producto.CostoUnitario;
            producto.CostoUnitario = linea.CostoUnitCdesc;
            producto.IdUsuarioModifica = idUsuario;
            producto.FechaUsuarioModifica = ahora;

            ProductosCostoHistorialHelper.Registrar(
                _db,
                producto.Id,
                costoAntesCompra,
                linea.CostoUnitCdesc,
                ProductosCostoHistorialHelper.OrigenCompra,
                ahora,
                idUsuario,
                idCompra);

            await _db.SaveChangesAsync();
        }

        /// <summary>
        /// Restaura el costo del producto al eliminar/revertir una compra.
        /// Si el costo actual sigue siendo el de esta compra, vuelve al anterior guardado.
        /// Si hubo compras posteriores, toma el costo de la última compra vigente.
        /// </summary>
        private async Task RevertirCostosCompra(int idCompra, int idUsuario, DateTime ahora)
        {
            var lineas = await _db.ComprasProductos
                .AsNoTracking()
                .Where(x => x.IdCompra == idCompra)
                .ToListAsync();

            foreach (var grupo in lineas.GroupBy(x => x.IdProducto))
            {
                var lineaRef = grupo.OrderByDescending(x => x.Id).First();
                var producto = await _db.Productos.FirstAsync(x => x.Id == grupo.Key);
                var costoAplicado = lineaRef.CostoUnitCdesc;
                var costoAntes = producto.CostoUnitario;
                decimal costoNuevo;

                if (producto.CostoUnitario == costoAplicado)
                {
                    costoNuevo = lineaRef.CostoUnitarioAnterior;
                    producto.CostoUnitario = costoNuevo;
                }
                else
                {
                    var ultimaOtra = await _db.ComprasProductos
                        .AsNoTracking()
                        .Include(cp => cp.IdCompraNavigation)
                        .Where(cp => cp.IdProducto == grupo.Key && cp.IdCompra != idCompra)
                        .OrderByDescending(cp => cp.IdCompraNavigation.Fecha)
                        .ThenByDescending(cp => cp.Id)
                        .FirstOrDefaultAsync();

                    costoNuevo = ultimaOtra != null
                        ? ultimaOtra.CostoUnitCdesc
                        : lineaRef.CostoUnitarioAnterior;
                    producto.CostoUnitario = costoNuevo;
                }

                ProductosCostoHistorialHelper.Registrar(
                    _db,
                    producto.Id,
                    costoAntes,
                    costoNuevo,
                    ProductosCostoHistorialHelper.OrigenReversionCompra,
                    ahora,
                    idUsuario,
                    idCompra);

                producto.IdUsuarioModifica = idUsuario;
                producto.FechaUsuarioModifica = ahora;
            }

            await _db.SaveChangesAsync();
        }

        private async Task RevertirStockLinea(ComprasProducto linea, int idUsuario, DateTime ahora)
        {
            if (!linea.IdInventarioMov.HasValue)
                return;

            var movId = linea.IdInventarioMov.Value;

            // Desvincular antes de borrar el movimiento (evita error de FK en actualización/eliminación)
            linea.IdInventarioMov = null;
            await _db.SaveChangesAsync();

            var mov = await _db.InventarioMovimientos
                .Include(x => x.IdInventarioNavigation)
                .FirstOrDefaultAsync(x => x.Id == movId);

            if (mov == null)
                return;

            var inv = mov.IdInventarioNavigation;
            inv.Stock -= mov.Entrada;
            if (inv.Stock < 0) inv.Stock = 0;

            _db.InventarioMovimientos.Remove(mov);
            await _db.SaveChangesAsync();
        }

        private async Task RegistrarMovimientoCuentaCorriente(
            ProveedoresCuentaCorriente cc,
            Compra compra,
            Proveedore proveedor,
            int idUsuario,
            DateTime ahora)
        {
            var movCc = new ProveedoresCuentaCorrienteMovimiento
            {
                IdCuentaCorriente = cc.Id,
                TipoMovimiento = ProveedoresCuentaCorrienteRepository.TIPO_COMPRA,
                IdMovimiento = compra.Id,
                Fecha = compra.Fecha,
                Concepto = $"Compra #{compra.Id} - {proveedor.Nombre}",
                Debe = compra.ImporteTotal,
                Haber = 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ProveedoresCuentaCorrienteMovimientos.Add(movCc);
            cc.Saldo += compra.ImporteTotal;
            compra.IdCuentaCorriente = cc.Id;
        }

        private async Task RevertirMovimientoCuentaCorriente(Compra compra)
        {
            var movCc = await _db.ProveedoresCuentaCorrienteMovimientos
                .Include(x => x.IdCuentaCorrienteNavigation)
                .FirstOrDefaultAsync(x =>
                    x.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_COMPRA &&
                    x.IdMovimiento == compra.Id);

            if (movCc == null)
                return;

            var cc = movCc.IdCuentaCorrienteNavigation;
            cc.Saldo -= (movCc.Debe - movCc.Haber);
            _db.ProveedoresCuentaCorrienteMovimientos.Remove(movCc);
            compra.IdCuentaCorriente = null;
        }

        public async Task<int> Insertar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var ahora = DateTime.Now;
                lineas ??= new List<ComprasProducto>();
                pagos ??= new List<CompraPagoRegistrar>();

                foreach (var l in lineas)
                    RecalcularLinea(l);

                RecalcularTotalesCompra(compra, lineas);

                compra.IdUsuarioRegistra = idUsuario;
                compra.FechaUsuarioRegistra = ahora;

                _db.Compras.Add(compra);
                await _db.SaveChangesAsync();

                var proveedor = await _db.Proveedores.FirstAsync(x => x.Id == compra.IdProveedor);
                var cc = await ObtenerOCrearCuentaCorriente(compra.IdProveedor);

                foreach (var linea in lineas)
                {
                    linea.IdCompra = compra.Id;
                    linea.IdUsuarioRegistra = idUsuario;
                    linea.FechaUsuarioRegistra = ahora;
                    RecalcularLinea(linea);

                    _db.ComprasProductos.Add(linea);
                    await _db.SaveChangesAsync();

                    await RegistrarStockCompra(
                        compra.Id,
                        compra.IdSucursal,
                        compra.Fecha,
                        linea,
                        idUsuario,
                        ahora);
                }

                await RegistrarMovimientoCuentaCorriente(cc, compra, proveedor, idUsuario, ahora);
                await _db.SaveChangesAsync();

                foreach (var pago in pagos)
                {
                    var concepto = string.IsNullOrWhiteSpace(pago.Concepto)
                        ? $"Pago compra #{compra.Id}"
                        : pago.Concepto.Trim();

                    var okPago = await _ccRepo.RegistrarPagoSinTransaccion(
                        compra.IdProveedor,
                        pago.IdCuenta,
                        pago.Fecha == default ? compra.Fecha : pago.Fecha,
                        concepto,
                        pago.Importe,
                        idUsuario,
                        compra.Id);

                    if (!okPago)
                        throw new InvalidOperationException("No se pudo registrar un pago de la compra.");
                }

                await trx.CommitAsync();

                return compra.Id;
            }
            catch
            {
                await trx.RollbackAsync();
                return 0;
            }
        }

        public async Task<bool> Actualizar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var entity = await _db.Compras
                    .Include(x => x.ComprasProductos)
                    .FirstOrDefaultAsync(x => x.Id == compra.Id);

                if (entity == null)
                    return false;

                var ahora = DateTime.Now;
                pagos ??= new List<CompraPagoRegistrar>();
                lineas ??= new List<ComprasProducto>();

                foreach (var old in entity.ComprasProductos.ToList())
                    await RevertirStockLinea(old, idUsuario, ahora);

                await RevertirCostosCompra(entity.Id, idUsuario, ahora);
                await RevertirMovimientoCuentaCorriente(entity);

                _db.ComprasProductos.RemoveRange(entity.ComprasProductos);
                await _db.SaveChangesAsync();

                foreach (var l in lineas)
                    RecalcularLinea(l);

                entity.Fecha = compra.Fecha;
                entity.IdProveedor = compra.IdProveedor;
                entity.IdSucursal = compra.IdSucursal;
                entity.NotaInterna = compra.NotaInterna;
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = ahora;

                RecalcularTotalesCompra(entity, lineas);

                var proveedor = await _db.Proveedores.FirstAsync(x => x.Id == entity.IdProveedor);
                var cc = await ObtenerOCrearCuentaCorriente(entity.IdProveedor);

                foreach (var linea in lineas)
                {
                    linea.Id = 0;
                    linea.IdInventarioMov = null;
                    linea.IdCompra = entity.Id;
                    linea.IdUsuarioRegistra = idUsuario;
                    linea.FechaUsuarioRegistra = ahora;
                    RecalcularLinea(linea);

                    _db.ComprasProductos.Add(linea);
                    await _db.SaveChangesAsync();

                    await RegistrarStockCompra(
                        entity.Id,
                        entity.IdSucursal,
                        entity.Fecha,
                        linea,
                        idUsuario,
                        ahora);
                }

                await RegistrarMovimientoCuentaCorriente(cc, entity, proveedor, idUsuario, ahora);
                await SincronizarPagosCompra(entity.Id, entity.IdProveedor, entity.Fecha, pagos, idUsuario);
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

        private async Task SincronizarPagosCompra(
            int idCompra,
            int idProveedor,
            DateTime fechaCompra,
            List<CompraPagoRegistrar> pagosPayload,
            int idUsuario)
        {
            var (_, pagosExistentes, movCcPorPago) = await ObtenerPagosCompra(idCompra);

            var payloadPorId = pagosPayload
                .Where(p => p.IdPago > 0)
                .ToDictionary(p => p.IdPago);

            var idsPayload = new HashSet<int>(payloadPorId.Keys);

            foreach (var existente in pagosExistentes)
            {
                if (idsPayload.Contains(existente.Id))
                    continue;

                if (!movCcPorPago.TryGetValue(existente.Id, out var idMovCc))
                    throw new InvalidOperationException("No se encontró el movimiento de cuenta corriente del pago.");

                if (!await _ccRepo.EliminarSinTransaccion(idMovCc))
                    throw new InvalidOperationException("No se pudo eliminar un pago de la compra.");
            }

            foreach (var existente in pagosExistentes)
            {
                if (!payloadPorId.TryGetValue(existente.Id, out var payload))
                    continue;

                var concepto = string.IsNullOrWhiteSpace(payload.Concepto)
                    ? $"Pago compra #{idCompra}"
                    : payload.Concepto.Trim();

                var fechaPago = payload.Fecha == default ? fechaCompra : payload.Fecha;

                var cambio =
                    existente.IdCuenta != payload.IdCuenta ||
                    existente.Fecha.Date != fechaPago.Date ||
                    (existente.Concepto ?? "").Trim() != concepto ||
                    existente.Importe != payload.Importe;

                if (!cambio)
                    continue;

                if (!movCcPorPago.TryGetValue(existente.Id, out var idMovCc))
                    throw new InvalidOperationException("No se encontró el movimiento de cuenta corriente del pago.");

                if (!await _ccRepo.EliminarSinTransaccion(idMovCc))
                    throw new InvalidOperationException("No se pudo actualizar un pago de la compra.");

                var ok = await _ccRepo.RegistrarPagoSinTransaccion(
                    idProveedor,
                    payload.IdCuenta,
                    fechaPago,
                    concepto,
                    payload.Importe,
                    idUsuario,
                    idCompra);

                if (!ok)
                    throw new InvalidOperationException("No se pudo actualizar un pago de la compra.");
            }

            foreach (var pago in pagosPayload.Where(p => p.IdPago <= 0))
            {
                var concepto = string.IsNullOrWhiteSpace(pago.Concepto)
                    ? $"Pago compra #{idCompra}"
                    : pago.Concepto.Trim();

                var ok = await _ccRepo.RegistrarPagoSinTransaccion(
                    idProveedor,
                    pago.IdCuenta,
                    pago.Fecha == default ? fechaCompra : pago.Fecha,
                    concepto,
                    pago.Importe,
                    idUsuario,
                    idCompra);

                if (!ok)
                    throw new InvalidOperationException("No se pudo registrar un pago de la compra.");
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var entity = await _db.Compras
                    .Include(x => x.ComprasProductos)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (entity == null)
                    return false;

                var ahora = DateTime.Now;
                var idUsuario = entity.IdUsuarioModifica ?? entity.IdUsuarioRegistra;

                await EliminarPagosCompraSinTransaccion(entity.Id);

                foreach (var linea in entity.ComprasProductos.ToList())
                    await RevertirStockLinea(linea, idUsuario, ahora);

                await RevertirCostosCompra(entity.Id, idUsuario, ahora);
                await RevertirMovimientoCuentaCorriente(entity);

                _db.ComprasProductos.RemoveRange(entity.ComprasProductos);
                _db.Compras.Remove(entity);

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

        private async Task EliminarPagosCompraSinTransaccion(int idCompra)
        {
            var (_, pagos, movCcPorPago) = await ObtenerPagosCompra(idCompra);

            foreach (var pago in pagos)
            {
                if (!movCcPorPago.TryGetValue(pago.Id, out var idMovCc))
                    throw new InvalidOperationException(
                        $"No se encontró el movimiento de cuenta corriente del pago #{pago.Id}.");

                if (!await _ccRepo.EliminarSinTransaccion(idMovCc))
                    throw new InvalidOperationException(
                        $"No se pudo revertir el pago #{pago.Id} (caja y cuenta corriente).");
            }
        }

        public async Task<(decimal importeTotal, List<ProveedoresPago> pagos, Dictionary<int, int> movimientosCcPorPago)> ObtenerPagosCompra(int idCompra)
        {
            var compra = await _db.Compras
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == idCompra);

            if (compra == null)
                return (0, new List<ProveedoresPago>(), new Dictionary<int, int>());

            var pagos = await _db.ProveedoresPagos
                .AsNoTracking()
                .Include(x => x.IdCuentaNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Where(x => x.IdCompra == idCompra)
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

            var idsPago = pagos.Select(p => p.Id).ToList();
            var movimientosCcPorPago = new Dictionary<int, int>();

            if (idsPago.Count > 0)
            {
                movimientosCcPorPago = await _db.ProveedoresCuentaCorrienteMovimientos
                    .AsNoTracking()
                    .Where(m =>
                        m.TipoMovimiento == ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR &&
                        idsPago.Contains(m.IdMovimiento))
                    .ToDictionaryAsync(m => m.IdMovimiento, m => m.Id);
            }

            return (compra.ImporteTotal, pagos, movimientosCcPorPago);
        }

        public async Task<Dictionary<int, decimal>> SumarPagosPorCompras(IReadOnlyList<int> idsCompra)
        {
            if (idsCompra == null || idsCompra.Count == 0)
                return new Dictionary<int, decimal>();

            return await _db.ProveedoresPagos
                .AsNoTracking()
                .Where(x => x.IdCompra != null && idsCompra.Contains(x.IdCompra.Value))
                .GroupBy(x => x.IdCompra!.Value)
                .Select(g => new { Id = g.Key, Total = g.Sum(p => p.Importe) })
                .ToDictionaryAsync(x => x.Id, x => x.Total);
        }
    }
}
