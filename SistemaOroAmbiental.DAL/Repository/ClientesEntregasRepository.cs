using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesEntregasRepository : IClientesEntregasRepository
    {
        public const int TIPO_LINEA_ENTREGA = 1;
        public const int TIPO_LINEA_RETIRO = 2;
        public const int TIPO_LINEA_RECUPERADO = 3;

        private readonly SistemaOroAmbientalContext _db;
        private readonly IClientesCuentaCorrienteRepository _ccRepo;
        private readonly IInventarioRepository _invRepo;
        private readonly IInventarioRecuperadoRepository _invRecRepo;

        public ClientesEntregasRepository(
            SistemaOroAmbientalContext context,
            IClientesCuentaCorrienteRepository ccRepo,
            IInventarioRepository invRepo,
            IInventarioRecuperadoRepository invRecRepo)
        {
            _db = context;
            _ccRepo = ccRepo;
            _invRepo = invRepo;
            _invRecRepo = invRecRepo;
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
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                .Include(x => x.IdContratoNavigation)
                    .ThenInclude(c => c!.IdEstablecimientoNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.ClientesEntregasProductos)
                .Include(x => x.ClientesEntregasProductosRecuperados)
                .AsQueryable();

            if (fechaDesde.HasValue)
                query = query.Where(x => x.Fecha >= fechaDesde.Value.Date);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(x => x.Fecha <= hasta);
            }

            if (idCliente.HasValue && idCliente > 0)
                query = query.Where(x => x.IdCliente == idCliente.Value);

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
                    x.IdClienteNavigation.Nombre.Contains(t) ||
                    (x.IdEstablecimientoNavigation != null && x.IdEstablecimientoNavigation.Nombre.Contains(t)) ||
                    (x.IdContratoNavigation != null && x.IdContratoNavigation.IdEstablecimientoNavigation != null &&
                     x.IdContratoNavigation.IdEstablecimientoNavigation.Nombre.Contains(t)));
            }

            return await query
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<ClientesEntrega?> Obtener(int id)
        {
            return await _db.ClientesEntregas
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(cl => cl.IdSucursalNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                .Include(x => x.IdContratoNavigation)
                    .ThenInclude(c => c!.IdEstablecimientoNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdCamionNavigation)
                .Include(x => x.ClientesEntregasProductos)
                    .ThenInclude(l => l.IdProductoNavigation)
                        .ThenInclude(p => p.IdMedidaNavigation)
                .Include(x => x.ClientesEntregasProductos)
                    .ThenInclude(l => l.IdListaPrecioNavigation)
                .Include(x => x.ClientesEntregasProductosRecuperados)
                    .ThenInclude(l => l.IdProductoNavigation)
                        .ThenInclude(p => p.IdMedidaNavigation)
                .Include(x => x.ClientesEntregasProductosRecuperados)
                    .ThenInclude(l => l.IdListaPrecioNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public static void RecalcularLinea(ClientesEntregasProducto linea)
        {
            RecalcularImportesLinea(
                linea.Cantidad,
                linea.PrecioVenta,
                linea.PorcDescuento,
                linea.PorcIva,
                linea.CostoUnitario,
                out var descUnitario,
                out var descTotal,
                out var precioVentacDesc,
                out var subtotalcDesc,
                out var ivaUnitario,
                out var totalIva,
                out var precioVentaFinal,
                out var subtotalFinal,
                out var subtotalCosto,
                out var ganancia);

            linea.DescUnitario = descUnitario;
            linea.DescTotal = descTotal;
            linea.PrecioVentacDesc = precioVentacDesc;
            linea.SubtotalcDesc = subtotalcDesc;
            linea.Ivaunitario = ivaUnitario;
            linea.TotalIva = totalIva;
            linea.PrecioVentaFinal = precioVentaFinal;
            linea.SubtotalFinal = subtotalFinal;
            linea.SubtotalCosto = subtotalCosto;
            linea.Ganancia = ganancia;
        }

        public static void RecalcularLineaRecuperado(ClientesEntregasProductosRecuperado linea)
        {
            RecalcularImportesLinea(
                linea.Cantidad,
                linea.PrecioVenta,
                linea.PorcDescuento,
                linea.PorcIva,
                linea.CostoUnitario,
                out var descUnitario,
                out var descTotal,
                out var precioVentacDesc,
                out var subtotalcDesc,
                out var ivaUnitario,
                out var totalIva,
                out var precioVentaFinal,
                out var subtotalFinal,
                out var subtotalCosto,
                out var ganancia);

            linea.DescUnitario = descUnitario;
            linea.DescTotal = descTotal;
            linea.PrecioVentacDesc = precioVentacDesc;
            linea.SubtotalcDesc = subtotalcDesc;
            linea.Ivaunitario = ivaUnitario;
            linea.TotalIva = totalIva;
            linea.PrecioVentaFinal = precioVentaFinal;
            linea.SubtotalFinal = subtotalFinal;
            linea.SubtotalCosto = subtotalCosto;
            linea.Ganancia = ganancia;
        }

        private static void RecalcularImportesLinea(
            decimal cantidad,
            decimal precioVenta,
            decimal porcDescuento,
            decimal porcIva,
            decimal costoUnitario,
            out decimal descUnitario,
            out decimal descTotal,
            out decimal precioVentacDesc,
            out decimal subtotalcDesc,
            out decimal ivaUnitario,
            out decimal totalIva,
            out decimal precioVentaFinal,
            out decimal subtotalFinal,
            out decimal subtotalCosto,
            out decimal ganancia)
        {
            var cant = cantidad > 0 ? cantidad : 0;

            descUnitario = Math.Round(precioVenta * porcDescuento / 100m, 4);
            descTotal = Math.Round(descUnitario * cant, 2);
            precioVentacDesc = Math.Round(precioVenta - descUnitario, 4);
            subtotalcDesc = Math.Round(precioVentacDesc * cant, 2);
            ivaUnitario = Math.Round(precioVentacDesc * porcIva / 100m, 4);
            totalIva = Math.Round(ivaUnitario * cant, 2);
            precioVentaFinal = Math.Round(precioVentacDesc + ivaUnitario, 4);
            subtotalFinal = Math.Round(subtotalcDesc + totalIva, 2);
            subtotalCosto = Math.Round(costoUnitario * cant, 2);
            ganancia = Math.Round(subtotalcDesc - subtotalCosto, 2);
        }

        private static void NormalizarTipoLinea(ClientesEntregasProducto linea)
        {
            linea.TipoMovimiento = linea.TipoMovimiento == TIPO_LINEA_RETIRO
                ? TIPO_LINEA_RETIRO
                : TIPO_LINEA_ENTREGA;
        }

        private static bool EsRetiro(ClientesEntregasProducto linea)
            => (linea?.TipoMovimiento ?? TIPO_LINEA_ENTREGA) == TIPO_LINEA_RETIRO;

        private static decimal SignoLinea(ClientesEntregasProducto linea)
            => EsRetiro(linea) ? -1m : 1m;

        public static void RecalcularTotalesEntrega(ClientesEntrega entrega, IEnumerable<ClientesEntregasProducto> lineas)
        {
            var lista = lineas.ToList();
            entrega.Subtotal = lista.Sum(x => SignoLinea(x) * x.SubtotalcDesc);
            entrega.Descuentos = lista.Sum(x => SignoLinea(x) * x.DescTotal);
            entrega.TotalIva = lista.Sum(x => SignoLinea(x) * x.TotalIva);
            entrega.ImporteTotal = lista.Sum(x => SignoLinea(x) * x.SubtotalFinal);
        }

        private async Task<(int idCliente, int idSucursal)> ResolverClienteYSucursal(ClientesEntrega entrega)
        {
            if (entrega.IdCliente > 0)
            {
                var cliente = await _db.Clientes.FirstAsync(x => x.Id == entrega.IdCliente);
                return (cliente.Id, cliente.IdSucursal);
            }

            if (entrega.IdContrato.HasValue && entrega.IdContrato > 0)
            {
                var contrato = await _db.Contratos
                    .Include(x => x.IdClienteNavigation)
                    .FirstAsync(x => x.Id == entrega.IdContrato);
                return (contrato.IdCliente, contrato.IdClienteNavigation.IdSucursal);
            }

            throw new InvalidOperationException("Debe indicar un cliente para la entrega.");
        }

        /// <summary>
        /// La entrega se imputa al establecimiento. El contrato es opcional:
        /// si hay uno solo para ese establecimiento, se asocia como referencia.
        /// </summary>
        private async Task AsegurarEstablecimientoYContrato(ClientesEntrega entrega)
        {
            if (entrega.IdEstablecimiento <= 0)
                throw new InvalidOperationException("Debe indicar el establecimiento de la entrega.");

            var est = await _db.ClientesEstablecimientos
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == entrega.IdEstablecimiento);

            if (est == null)
                throw new InvalidOperationException("El establecimiento indicado no existe.");

            if (entrega.IdCliente <= 0)
                entrega.IdCliente = est.IdCliente;
            else if (est.IdCliente != entrega.IdCliente)
                throw new InvalidOperationException("El establecimiento no pertenece al cliente de la entrega.");

            if (entrega.IdContrato is > 0)
                return;

            var contratos = await _db.Contratos
                .AsNoTracking()
                .Where(c => c.IdEstablecimiento == entrega.IdEstablecimiento)
                .Select(c => c.Id)
                .ToListAsync();

            if (contratos.Count == 1)
                entrega.IdContrato = contratos[0];
        }

        private async Task RegistrarStockRecuperadoEntrega(
            int idEntrega,
            int idSucursal,
            DateTime fecha,
            ClientesEntregasProductosRecuperado linea,
            int idUsuario)
        {
            var producto = await _db.Productos.FirstAsync(x => x.Id == linea.IdProducto);

            await _invRecRepo.RegistrarEntrada(
                idSucursal,
                linea.IdProducto,
                linea.Cantidad,
                fecha,
                $"Recuperado #{idEntrega} - {producto.Nombre}",
                InventarioRecuperadoRepository.TIPO_ENTREGA,
                idEntrega,
                idUsuario);
        }

        private async Task RegistrarStockEntrega(
            int idEntrega,
            int idSucursal,
            DateTime fecha,
            ClientesEntregasProducto linea,
            int idUsuario,
            DateTime ahora)
        {
            // Retiro: baja el "en poder del cliente" (entregadas - retiradas) pero NO vuelve al
            // inventario vendible. Esas cajas van a tratamiento; si se recuperan, se cargan
            // manualmente / en la solapa Productos recuperados (InventarioRecuperado).
            if (EsRetiro(linea))
                return;

            var producto = await _db.Productos.FirstAsync(x => x.Id == linea.IdProducto);
            var inv = await _invRepo.ObtenerOCrearInventario(idSucursal, linea.IdProducto);

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
            await _invRecRepo.RevertirMovimientosEntrega(idEntrega);

            var movs = await _db.InventarioMovimientos
                .Include(x => x.IdInventarioNavigation)
                .Where(x =>
                    x.IdMovimiento == idEntrega &&
                    x.TipoMovimiento == InventarioRepository.TIPO_ENTREGA)
                .ToListAsync();

            foreach (var mov in movs)
            {
                var inv = mov.IdInventarioNavigation;
                inv.Stock += mov.Salida;
                inv.Stock -= mov.Entrada;
                if (inv.Stock < 0) inv.Stock = 0;
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
                Debe = entrega.ImporteTotal >= 0 ? entrega.ImporteTotal : 0,
                Haber = entrega.ImporteTotal < 0 ? Math.Abs(entrega.ImporteTotal) : 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ClientesCuentaCorrienteMovimientos.Add(movCc);
            cc.Saldo += (movCc.Debe - movCc.Haber);
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
            List<ClientesEntregasProductosRecuperado> lineasRecuperadas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var ahora = DateTime.Now;
                lineas ??= new List<ClientesEntregasProducto>();
                lineasRecuperadas ??= new List<ClientesEntregasProductosRecuperado>();
                cobros ??= new List<EntregaCobroRegistrar>();

                foreach (var l in lineas)
                {
                    NormalizarTipoLinea(l);
                    RecalcularLinea(l);
                }

                foreach (var l in lineasRecuperadas)
                    RecalcularLineaRecuperado(l);

                await AsegurarEstablecimientoYContrato(entrega);

                RecalcularTotalesEntrega(entrega, lineas);
                entrega.ImporteAbonado = 0;
                entrega.Saldo = entrega.ImporteTotal;

                entrega.IdUsuarioRegistra = idUsuario;
                entrega.FechaUsuarioRegistra = ahora;

                _db.ClientesEntregas.Add(entrega);
                await _db.SaveChangesAsync();

                var (idCliente, idSucursal) = await ResolverClienteYSucursal(entrega);
                entrega.IdCliente = idCliente;
                var cliente = await _db.Clientes.FirstAsync(x => x.Id == idCliente);
                var cc = await _ccRepo.ObtenerOCrearCuentaCorriente(idCliente);

                foreach (var linea in lineas)
                {
                    linea.IdEntrega = entrega.Id;
                    linea.IdUsuarioRegistra = idUsuario;
                    linea.FechaUsuarioRegistra = ahora;
                    RecalcularLinea(linea);
                    _db.ClientesEntregasProductos.Add(linea);
                }

                foreach (var lineaRec in lineasRecuperadas)
                {
                    lineaRec.IdEntrega = entrega.Id;
                    lineaRec.IdUsuarioRegistra = idUsuario;
                    lineaRec.FechaUsuarioRegistra = ahora;
                    RecalcularLineaRecuperado(lineaRec);
                    _db.ClientesEntregasProductosRecuperados.Add(lineaRec);
                }

                if (lineas.Count > 0 || lineasRecuperadas.Count > 0)
                    await _db.SaveChangesAsync();

                foreach (var linea in lineas)
                {
                    await RegistrarStockEntrega(
                        entrega.Id,
                        idSucursal,
                        entrega.Fecha,
                        linea,
                        idUsuario,
                        ahora);
                }

                foreach (var lineaRec in lineasRecuperadas)
                {
                    await RegistrarStockRecuperadoEntrega(
                        entrega.Id,
                        idSucursal,
                        entrega.Fecha,
                        lineaRec,
                        idUsuario);
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
            List<ClientesEntregasProductosRecuperado> lineasRecuperadas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var entity = await _db.ClientesEntregas
                    .Include(x => x.ClientesEntregasProductos)
                    .Include(x => x.ClientesEntregasProductosRecuperados)
                    .FirstOrDefaultAsync(x => x.Id == entrega.Id);

                if (entity == null)
                    return false;

                var ahora = DateTime.Now;
                cobros ??= new List<EntregaCobroRegistrar>();
                lineas ??= new List<ClientesEntregasProducto>();
                lineasRecuperadas ??= new List<ClientesEntregasProductosRecuperado>();

                await RevertirStockEntrega(entity.Id);
                await RevertirMovimientoCuentaCorriente(entity);

                _db.ClientesEntregasProductos.RemoveRange(entity.ClientesEntregasProductos);
                _db.ClientesEntregasProductosRecuperados.RemoveRange(entity.ClientesEntregasProductosRecuperados);
                await _db.SaveChangesAsync();

                foreach (var l in lineas)
                {
                    NormalizarTipoLinea(l);
                    RecalcularLinea(l);
                }

                foreach (var l in lineasRecuperadas)
                    RecalcularLineaRecuperado(l);

                await AsegurarEstablecimientoYContrato(entrega);

                entity.Fecha = entrega.Fecha;
                entity.IdCliente = entrega.IdCliente;
                entity.IdEstablecimiento = entrega.IdEstablecimiento;
                entity.IdContrato = entrega.IdContrato;
                entity.IdEstado = entrega.IdEstado;
                entity.NotaInterna = entrega.NotaInterna;
                entity.NotaCliente = entrega.NotaCliente;
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = ahora;

                RecalcularTotalesEntrega(entity, lineas);

                var (idCliente, idSucursal) = await ResolverClienteYSucursal(entity);
                entity.IdCliente = idCliente;
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

                foreach (var lineaRec in lineasRecuperadas)
                {
                    lineaRec.Id = 0;
                    lineaRec.IdEntrega = entity.Id;
                    lineaRec.IdUsuarioRegistra = idUsuario;
                    lineaRec.FechaUsuarioRegistra = ahora;
                    RecalcularLineaRecuperado(lineaRec);

                    _db.ClientesEntregasProductosRecuperados.Add(lineaRec);
                    await _db.SaveChangesAsync();

                    await RegistrarStockRecuperadoEntrega(
                        entity.Id,
                        idSucursal,
                        entity.Fecha,
                        lineaRec,
                        idUsuario);
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
                    .Include(x => x.ClientesEntregasProductosRecuperados)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (entity == null)
                    return false;

                await EliminarCobrosEntregaSinTransaccion(entity.Id);
                await RevertirStockEntrega(entity.Id);
                await RevertirMovimientoCuentaCorriente(entity);

                _db.ClientesEntregasProductos.RemoveRange(entity.ClientesEntregasProductos);
                _db.ClientesEntregasProductosRecuperados.RemoveRange(entity.ClientesEntregasProductosRecuperados);
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
