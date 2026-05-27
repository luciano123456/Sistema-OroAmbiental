using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesEntregasRepository : IClientesEntregasRepository
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IClientesCuentaCorrienteRepository _ccRepo;
        private readonly IInventarioRepository _invRepo;

        public ClientesEntregasRepository(
            SistemaOroAmbientalContext context,
            IClientesCuentaCorrienteRepository ccRepo,
            IInventarioRepository invRepo)
        {
            _db = context;
            _ccRepo = ccRepo;
            _invRepo = invRepo;
        }

        public async Task<List<ClientesEntrega>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCliente,
            int? idContrato,
            int? idEstado,
            string? texto)
        {
            var query = _db.ClientesEntregas
                .AsNoTracking()
                .Include(x => x.IdContratoNavigation)
                    .ThenInclude(c => c.IdClienteNavigation)
                .Include(x => x.IdContratoNavigation)
                    .ThenInclude(c => c.IdEstablecimientoNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.ClientesEntregasProductos)
                .AsQueryable();

            if (fechaDesde.HasValue)
                query = query.Where(x => x.Fecha >= fechaDesde.Value.Date);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(x => x.Fecha <= hasta);
            }

            if (idCliente.HasValue && idCliente > 0)
                query = query.Where(x => x.IdContratoNavigation.IdCliente == idCliente.Value);

            if (idContrato.HasValue && idContrato > 0)
                query = query.Where(x => x.IdContrato == idContrato.Value);

            if (idEstado.HasValue)
                query = query.Where(x => x.IdEstado == idEstado.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                query = query.Where(x =>
                    (x.NotaInterna != null && x.NotaInterna.Contains(t)) ||
                    (x.NotaCliente != null && x.NotaCliente.Contains(t)) ||
                    x.IdContratoNavigation.IdClienteNavigation.Nombre.Contains(t) ||
                    x.IdContratoNavigation.IdEstablecimientoNavigation.Nombre.Contains(t));
            }

            return await query
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<ClientesEntrega?> Obtener(int id)
        {
            return await _db.ClientesEntregas
                .Include(x => x.IdContratoNavigation)
                    .ThenInclude(c => c.IdClienteNavigation)
                        .ThenInclude(cl => cl.IdSucursalNavigation)
                .Include(x => x.IdContratoNavigation)
                    .ThenInclude(c => c.IdEstablecimientoNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.ClientesEntregasProductos)
                    .ThenInclude(l => l.IdProductoNavigation)
                        .ThenInclude(p => p.IdMedidaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public static void RecalcularLinea(ClientesEntregasProducto linea)
        {
            var cant = linea.Cantidad > 0 ? linea.Cantidad : 0;
            var precio = linea.PrecioVenta;
            var porcDesc = linea.PorcDescuento;
            var porcIva = linea.PorcIva;
            var costo = linea.CostoUnitario;

            linea.DescUnitario = Math.Round(precio * porcDesc / 100m, 4);
            linea.DescTotal = Math.Round(linea.DescUnitario * cant, 2);
            linea.PrecioVentacDesc = Math.Round(precio - linea.DescUnitario, 4);
            linea.SubtotalcDesc = Math.Round(linea.PrecioVentacDesc * cant, 2);
            linea.Ivaunitario = Math.Round(linea.PrecioVentacDesc * porcIva / 100m, 4);
            linea.TotalIva = Math.Round(linea.Ivaunitario * cant, 2);
            linea.PrecioVentaFinal = Math.Round(linea.PrecioVentacDesc + linea.Ivaunitario, 4);
            linea.SubtotalFinal = Math.Round(linea.SubtotalcDesc + linea.TotalIva, 2);
            linea.SubtotalCosto = Math.Round(costo * cant, 2);
            linea.Ganancia = Math.Round(linea.SubtotalcDesc - linea.SubtotalCosto, 2);
        }

        public static void RecalcularTotalesEntrega(ClientesEntrega entrega, IEnumerable<ClientesEntregasProducto> lineas)
        {
            var lista = lineas.ToList();
            entrega.Subtotal = lista.Sum(x => x.SubtotalcDesc);
            entrega.Descuentos = lista.Sum(x => x.DescTotal);
            entrega.TotalIva = lista.Sum(x => x.TotalIva);
            entrega.ImporteTotal = lista.Sum(x => x.SubtotalFinal);
        }

        private async Task<(int idCliente, int idSucursal)> ResolverClienteYSucursal(int idContrato)
        {
            var contrato = await _db.Contratos
                .Include(x => x.IdClienteNavigation)
                .FirstAsync(x => x.Id == idContrato);

            return (contrato.IdCliente, contrato.IdClienteNavigation.IdSucursal);
        }

        private async Task RegistrarStockEntrega(
            int idEntrega,
            int idSucursal,
            DateTime fecha,
            ClientesEntregasProducto linea,
            int idUsuario,
            DateTime ahora)
        {
            var inv = await _invRepo.ObtenerOCrearInventario(idSucursal, linea.IdProducto);
            var producto = await _db.Productos.FirstAsync(x => x.Id == linea.IdProducto);

            if (inv.Stock < linea.Cantidad)
                throw new InvalidOperationException(
                    $"Stock insuficiente para {producto.Nombre} (disponible: {inv.Stock:N2}).");

            var mov = new InventarioMovimiento
            {
                IdInventario = inv.Id,
                TipoMovimiento = InventarioRepository.TIPO_ENTREGA,
                IdMovimiento = idEntrega,
                Fecha = fecha,
                Concepto = $"Entrega #{idEntrega} - {producto.Nombre}",
                Entrada = 0,
                Salida = linea.Cantidad,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.InventarioMovimientos.Add(mov);
            inv.Stock -= linea.Cantidad;
            if (inv.Stock < 0) inv.Stock = 0;

            await _db.SaveChangesAsync();
        }

        private async Task RevertirStockEntrega(int idEntrega)
        {
            var movs = await _db.InventarioMovimientos
                .Include(x => x.IdInventarioNavigation)
                .Where(x =>
                    x.TipoMovimiento == InventarioRepository.TIPO_ENTREGA &&
                    x.IdMovimiento == idEntrega)
                .ToListAsync();

            foreach (var mov in movs)
            {
                var inv = mov.IdInventarioNavigation;
                inv.Stock += mov.Salida;
                _db.InventarioMovimientos.Remove(mov);
            }

            if (movs.Count > 0)
                await _db.SaveChangesAsync();
        }

        private async Task RegistrarMovimientoCuentaCorriente(
            ClientesCuentaCorriente cc,
            ClientesEntrega entrega,
            Cliente cliente,
            int idUsuario,
            DateTime ahora)
        {
            var movCc = new ClientesCuentaCorrienteMovimiento
            {
                IdCuentaCorriente = cc.Id,
                TipoMovimiento = ClientesCuentaCorrienteRepository.TIPO_ENTREGA,
                IdMovimiento = entrega.Id,
                Fecha = entrega.Fecha,
                Concepto = $"Entrega #{entrega.Id} - {cliente.Nombre}",
                Debe = entrega.ImporteTotal,
                Haber = 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ClientesCuentaCorrienteMovimientos.Add(movCc);
            cc.Saldo += entrega.ImporteTotal;
            entrega.IdCuentaCorriente = cc.Id;
        }

        private async Task RevertirMovimientoCuentaCorriente(ClientesEntrega entrega)
        {
            var movCc = await _db.ClientesCuentaCorrienteMovimientos
                .Include(x => x.IdCuentaCorrienteNavigation)
                .FirstOrDefaultAsync(x =>
                    x.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_ENTREGA &&
                    x.IdMovimiento == entrega.Id);

            if (movCc == null)
                return;

            var cc = movCc.IdCuentaCorrienteNavigation;
            cc.Saldo -= (movCc.Debe - movCc.Haber);
            _db.ClientesCuentaCorrienteMovimientos.Remove(movCc);
            entrega.IdCuentaCorriente = null;
            await _db.SaveChangesAsync();
        }

        private async Task ActualizarImporteAbonadoYSaldo(int idEntrega)
        {
            var entrega = await _db.ClientesEntregas.FirstAsync(x => x.Id == idEntrega);
            var abonado = await _db.ClientesCobros
                .Where(x => x.IdEntrega == idEntrega)
                .SumAsync(x => (decimal?)x.Importe) ?? 0m;

            entrega.ImporteAbonado = abonado;
            entrega.Saldo = entrega.ImporteTotal - abonado;
            await _db.SaveChangesAsync();
        }

        public async Task<int> Insertar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var ahora = DateTime.Now;
                lineas ??= new List<ClientesEntregasProducto>();
                cobros ??= new List<EntregaCobroRegistrar>();

                foreach (var l in lineas)
                    RecalcularLinea(l);

                RecalcularTotalesEntrega(entrega, lineas);
                entrega.ImporteAbonado = 0;
                entrega.Saldo = entrega.ImporteTotal;

                entrega.IdUsuarioRegistra = idUsuario;
                entrega.FechaUsuarioRegistra = ahora;

                _db.ClientesEntregas.Add(entrega);
                await _db.SaveChangesAsync();

                var (idCliente, idSucursal) = await ResolverClienteYSucursal(entrega.IdContrato);
                var cliente = await _db.Clientes.FirstAsync(x => x.Id == idCliente);
                var cc = await _ccRepo.ObtenerOCrearCuentaCorriente(idCliente);

                foreach (var linea in lineas)
                {
                    linea.IdEntrega = entrega.Id;
                    linea.IdUsuarioRegistra = idUsuario;
                    linea.FechaUsuarioRegistra = ahora;
                    RecalcularLinea(linea);

                    _db.ClientesEntregasProductos.Add(linea);
                    await _db.SaveChangesAsync();

                    await RegistrarStockEntrega(
                        entrega.Id,
                        idSucursal,
                        entrega.Fecha,
                        linea,
                        idUsuario,
                        ahora);
                }

                await RegistrarMovimientoCuentaCorriente(cc, entrega, cliente, idUsuario, ahora);
                await _db.SaveChangesAsync();

                foreach (var cobro in cobros)
                {
                    var concepto = string.IsNullOrWhiteSpace(cobro.Concepto)
                        ? $"Cobro entrega #{entrega.Id}"
                        : cobro.Concepto.Trim();

                    var ok = await _ccRepo.RegistrarCobroSinTransaccion(
                        idCliente,
                        cobro.IdCuenta,
                        cobro.Fecha == default ? entrega.Fecha : cobro.Fecha,
                        concepto,
                        cobro.Importe,
                        idUsuario,
                        entrega.Id);

                    if (!ok)
                        throw new InvalidOperationException("No se pudo registrar un cobro de la entrega.");
                }

                await ActualizarImporteAbonadoYSaldo(entrega.Id);
                await trx.CommitAsync();

                return entrega.Id;
            }
            catch (Exception ex)
            {
                await trx.RollbackAsync();
                throw new InvalidOperationException(
                    "No se pudo registrar la entrega (stock, cuenta corriente o cobros).", ex);
            }
        }

        public async Task<bool> Actualizar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var entity = await _db.ClientesEntregas
                    .Include(x => x.ClientesEntregasProductos)
                    .FirstOrDefaultAsync(x => x.Id == entrega.Id);

                if (entity == null)
                    return false;

                var ahora = DateTime.Now;
                cobros ??= new List<EntregaCobroRegistrar>();
                lineas ??= new List<ClientesEntregasProducto>();

                await RevertirStockEntrega(entity.Id);
                await RevertirMovimientoCuentaCorriente(entity);

                _db.ClientesEntregasProductos.RemoveRange(entity.ClientesEntregasProductos);
                await _db.SaveChangesAsync();

                foreach (var l in lineas)
                    RecalcularLinea(l);

                entity.Fecha = entrega.Fecha;
                entity.IdContrato = entrega.IdContrato;
                entity.IdEstado = entrega.IdEstado;
                entity.NotaInterna = entrega.NotaInterna;
                entity.NotaCliente = entrega.NotaCliente;
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = ahora;

                RecalcularTotalesEntrega(entity, lineas);

                var (idCliente, idSucursal) = await ResolverClienteYSucursal(entity.IdContrato);
                var cliente = await _db.Clientes.FirstAsync(x => x.Id == idCliente);
                var cc = await _ccRepo.ObtenerOCrearCuentaCorriente(idCliente);

                foreach (var linea in lineas)
                {
                    linea.Id = 0;
                    linea.IdEntrega = entity.Id;
                    linea.IdUsuarioRegistra = idUsuario;
                    linea.FechaUsuarioRegistra = ahora;
                    RecalcularLinea(linea);

                    _db.ClientesEntregasProductos.Add(linea);
                    await _db.SaveChangesAsync();

                    await RegistrarStockEntrega(
                        entity.Id,
                        idSucursal,
                        entity.Fecha,
                        linea,
                        idUsuario,
                        ahora);
                }

                await RegistrarMovimientoCuentaCorriente(cc, entity, cliente, idUsuario, ahora);
                await SincronizarCobrosEntrega(entity.Id, idCliente, entity.Fecha, cobros, idUsuario);
                await ActualizarImporteAbonadoYSaldo(entity.Id);
                await _db.SaveChangesAsync();
                await trx.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await trx.RollbackAsync();
                throw new InvalidOperationException(
                    "No se pudo modificar la entrega (stock, cuenta corriente o cobros).", ex);
            }
        }

        private async Task SincronizarCobrosEntrega(
            int idEntrega,
            int idCliente,
            DateTime fechaEntrega,
            List<EntregaCobroRegistrar> cobrosPayload,
            int idUsuario)
        {
            var (_, cobrosExistentes, movCcPorCobro) = await ObtenerCobrosEntrega(idEntrega);

            var payloadPorId = cobrosPayload
                .Where(c => c.IdCobro > 0)
                .ToDictionary(c => c.IdCobro);

            var idsPayload = new HashSet<int>(payloadPorId.Keys);

            foreach (var existente in cobrosExistentes)
            {
                if (idsPayload.Contains(existente.Id))
                    continue;

                if (!movCcPorCobro.TryGetValue(existente.Id, out var idMovCc))
                    throw new InvalidOperationException("No se encontró el movimiento de cuenta corriente del cobro.");

                if (!await _ccRepo.EliminarSinTransaccion(idMovCc))
                    throw new InvalidOperationException("No se pudo eliminar un cobro de la entrega.");
            }

            foreach (var existente in cobrosExistentes)
            {
                if (!payloadPorId.TryGetValue(existente.Id, out var payload))
                    continue;

                var concepto = string.IsNullOrWhiteSpace(payload.Concepto)
                    ? $"Cobro entrega #{idEntrega}"
                    : payload.Concepto.Trim();

                var fechaCobro = payload.Fecha == default ? fechaEntrega : payload.Fecha;

                var cambio =
                    existente.IdCuenta != payload.IdCuenta ||
                    existente.Fecha.Date != fechaCobro.Date ||
                    (existente.Concepto ?? "").Trim() != concepto ||
                    existente.Importe != payload.Importe;

                if (!cambio)
                    continue;

                if (!movCcPorCobro.TryGetValue(existente.Id, out var idMovCc))
                    throw new InvalidOperationException("No se encontró el movimiento de cuenta corriente del cobro.");

                if (!await _ccRepo.EliminarSinTransaccion(idMovCc))
                    throw new InvalidOperationException("No se pudo actualizar un cobro de la entrega.");

                var ok = await _ccRepo.RegistrarCobroSinTransaccion(
                    idCliente,
                    payload.IdCuenta,
                    fechaCobro,
                    concepto,
                    payload.Importe,
                    idUsuario,
                    idEntrega);

                if (!ok)
                    throw new InvalidOperationException("No se pudo actualizar un cobro de la entrega.");
            }

            foreach (var cobro in cobrosPayload.Where(c => c.IdCobro <= 0))
            {
                var concepto = string.IsNullOrWhiteSpace(cobro.Concepto)
                    ? $"Cobro entrega #{idEntrega}"
                    : cobro.Concepto.Trim();

                var ok = await _ccRepo.RegistrarCobroSinTransaccion(
                    idCliente,
                    cobro.IdCuenta,
                    cobro.Fecha == default ? fechaEntrega : cobro.Fecha,
                    concepto,
                    cobro.Importe,
                    idUsuario,
                    idEntrega);

                if (!ok)
                    throw new InvalidOperationException("No se pudo registrar un cobro de la entrega.");
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var entity = await _db.ClientesEntregas
                    .Include(x => x.ClientesEntregasProductos)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (entity == null)
                    return false;

                await EliminarCobrosEntregaSinTransaccion(entity.Id);
                await RevertirStockEntrega(entity.Id);
                await RevertirMovimientoCuentaCorriente(entity);

                _db.ClientesEntregasProductos.RemoveRange(entity.ClientesEntregasProductos);
                _db.ClientesEntregas.Remove(entity);

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

        private async Task EliminarCobrosEntregaSinTransaccion(int idEntrega)
        {
            var (_, cobros, movCcPorCobro) = await ObtenerCobrosEntrega(idEntrega);

            foreach (var cobro in cobros)
            {
                if (!movCcPorCobro.TryGetValue(cobro.Id, out var idMovCc))
                    throw new InvalidOperationException(
                        $"No se encontró el movimiento de cuenta corriente del cobro #{cobro.Id}.");

                if (!await _ccRepo.EliminarSinTransaccion(idMovCc))
                    throw new InvalidOperationException(
                        $"No se pudo revertir el cobro #{cobro.Id} (caja y cuenta corriente).");
            }
        }

        public async Task<(decimal importeTotal, List<ClientesCobro> cobros, Dictionary<int, int> movimientosCcPorCobro)> ObtenerCobrosEntrega(int idEntrega)
        {
            var entrega = await _db.ClientesEntregas
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == idEntrega);

            if (entrega == null)
                return (0, new List<ClientesCobro>(), new Dictionary<int, int>());

            var cobros = await _db.ClientesCobros
                .AsNoTracking()
                .Include(x => x.IdCuentaNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Where(x => x.IdEntrega == idEntrega)
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

            var idsCobro = cobros.Select(c => c.Id).ToList();
            var movimientosCcPorCobro = new Dictionary<int, int>();

            if (idsCobro.Count > 0)
            {
                movimientosCcPorCobro = await _db.ClientesCuentaCorrienteMovimientos
                    .AsNoTracking()
                    .Where(m =>
                        m.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE &&
                        idsCobro.Contains(m.IdMovimiento))
                    .ToDictionaryAsync(m => m.IdMovimiento, m => m.Id);
            }

            return (entrega.ImporteTotal, cobros, movimientosCcPorCobro);
        }

        public async Task<Dictionary<int, decimal>> SumarCobrosPorEntregas(IReadOnlyList<int> idsEntrega)
        {
            if (idsEntrega == null || idsEntrega.Count == 0)
                return new Dictionary<int, decimal>();

            return await _db.ClientesCobros
                .AsNoTracking()
                .Where(x => x.IdEntrega != null && idsEntrega.Contains(x.IdEntrega.Value))
                .GroupBy(x => x.IdEntrega!.Value)
                .Select(g => new { Id = g.Key, Total = g.Sum(c => c.Importe) })
                .ToDictionaryAsync(x => x.Id, x => x.Total);
        }
    }
}
