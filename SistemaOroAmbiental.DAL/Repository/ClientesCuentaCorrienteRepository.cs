using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesCuentaCorrienteRepository : IClientesCuentaCorrienteRepository
    {
        public const string TIPO_COBRO_CLIENTE = "COBRO CLIENTE";
        public const string TIPO_AJUSTE_CLIENTE = "AJUSTE CLIENTE";
        public const string TIPO_INTERES_CLIENTE = "INTERES CLIENTE";
        public const string TIPO_ENTREGA = "ENTREGA";

        private readonly SistemaOroAmbientalContext _db;

        public ClientesCuentaCorrienteRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<(Cliente cliente, decimal saldo)>> ListarClientes(string? buscar, bool soloSaldoActivo)
        {
            var query = _db.Clientes.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(buscar))
                query = query.Where(x => x.Nombre.Contains(buscar));

            var clientes = await query.OrderBy(x => x.Nombre).ToListAsync();
            var ids = clientes.Select(x => x.Id).ToList();

            var saldos = await _db.ClientesCuentaCorrientes
                .AsNoTracking()
                .Where(x => ids.Contains(x.IdCliente))
                .ToDictionaryAsync(x => x.IdCliente, x => x.Saldo);

            var lista = clientes
                .Select(c => (
                    cliente: c,
                    saldo: saldos.TryGetValue(c.Id, out var s) ? s : 0m
                ))
                .ToList();

            if (soloSaldoActivo)
                lista = lista.Where(x => x.saldo != 0).ToList();

            return lista;
        }

        public async Task<ClientesCuentaCorriente> ObtenerOCrearCuentaCorriente(int idCliente)
        {
            var cc = await _db.ClientesCuentaCorrientes
                .FirstOrDefaultAsync(x => x.IdCliente == idCliente);

            if (cc != null)
                return cc;

            cc = new ClientesCuentaCorriente
            {
                IdCliente = idCliente,
                Saldo = 0
            };

            _db.ClientesCuentaCorrientes.Add(cc);
            await _db.SaveChangesAsync();
            return cc;
        }

        private IQueryable<ClientesCuentaCorrienteMovimiento> QueryMovimientosCliente(int idCliente)
            => _db.ClientesCuentaCorrienteMovimientos
                .AsNoTracking()
                .Include(x => x.IdCuentaCorrienteNavigation)
                .Where(x => x.IdCuentaCorrienteNavigation.IdCliente == idCliente);

        private static IQueryable<ClientesCuentaCorrienteMovimiento> AplicarFiltroTipo(
            IQueryable<ClientesCuentaCorrienteMovimiento> query,
            string? tipoMovimiento)
        {
            if (string.IsNullOrWhiteSpace(tipoMovimiento))
                return query;

            var t = tipoMovimiento.Trim().ToUpperInvariant();

            return t switch
            {
                "PAGO" or "COBRO" => query.Where(x => x.TipoMovimiento == TIPO_COBRO_CLIENTE),
                "AJUSTE" => query.Where(x => x.TipoMovimiento == TIPO_AJUSTE_CLIENTE),
                "INTERES" => query.Where(x => x.TipoMovimiento == TIPO_INTERES_CLIENTE),
                "ENTREGA" => query.Where(x => x.TipoMovimiento == TIPO_ENTREGA),
                _ => query.Where(x => x.TipoMovimiento == tipoMovimiento)
            };
        }

        public async Task<List<ClientesCuentaCorrienteMovimiento>> Movimientos(
            int idCliente,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            var query = QueryMovimientosCliente(idCliente);

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

            return await query
                .OrderBy(x => x.Fecha)
                .ThenBy(x => x.Id)
                .ToListAsync();
        }

        public async Task<decimal> SaldoAnterior(int idCliente, DateTime? fechaDesde)
        {
            if (!fechaDesde.HasValue)
                return 0;

            return await QueryMovimientosCliente(idCliente)
                .Where(x => x.Fecha < fechaDesde.Value.Date)
                .SumAsync(x => x.Debe - x.Haber);
        }

        public async Task<(decimal debe, decimal haber, int cantidad)> Resumen(
            int idCliente,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            var query = QueryMovimientosCliente(idCliente);

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

            var debe = await query.SumAsync(x => x.Debe);
            var haber = await query.SumAsync(x => x.Haber);
            var cantidad = await query.CountAsync();

            return (debe, haber, cantidad);
        }

        public async Task<(ClientesCuentaCorrienteMovimiento? mov, string? cuenta, string? sucursal, decimal saldo)> ObtenerMovimiento(int id)
        {
            var mov = await _db.ClientesCuentaCorrienteMovimientos
                .AsNoTracking()
                .Include(x => x.IdCuentaCorrienteNavigation)
                    .ThenInclude(cc => cc.IdClienteNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (mov == null)
                return (null, null, null, 0);

            string? cuenta = null;
            string? sucursal = null;

            if (mov.TipoMovimiento == TIPO_COBRO_CLIENTE)
            {
                var cobro = await _db.ClientesCobros
                    .AsNoTracking()
                    .Include(x => x.IdCuentaNavigation)
                        .ThenInclude(c => c.IdSucursalNavigation)
                    .FirstOrDefaultAsync(x => x.Id == mov.IdMovimiento);

                cuenta = cobro?.IdCuentaNavigation?.Nombre;
                sucursal = cobro?.IdCuentaNavigation?.IdSucursalNavigation?.Nombre;
            }
            else if (mov.TipoMovimiento == TIPO_AJUSTE_CLIENTE)
            {
                var cajaMov = await _db.CajasMovimientos
                    .AsNoTracking()
                    .Include(x => x.IdCajaNavigation)
                        .ThenInclude(c => c.IdCuentaNavigation)
                            .ThenInclude(cu => cu.IdSucursalNavigation)
                    .FirstOrDefaultAsync(x =>
                        x.TipoMovimiento == TIPO_AJUSTE_CLIENTE &&
                        x.IdMovimiento == mov.Id);

                cuenta = cajaMov?.IdCajaNavigation?.IdCuentaNavigation?.Nombre;
                sucursal = cajaMov?.IdCajaNavigation?.IdCuentaNavigation?.IdSucursalNavigation?.Nombre;
            }

            var idCliente = mov.IdCuentaCorrienteNavigation.IdCliente;

            var saldo = await _db.ClientesCuentaCorrienteMovimientos
                .Where(x => x.IdCuentaCorrienteNavigation.IdCliente == idCliente)
                .Where(x =>
                    x.Fecha < mov.Fecha ||
                    (x.Fecha == mov.Fecha && x.Id <= mov.Id))
                .SumAsync(x => x.Debe - x.Haber);

            return (mov, cuenta, sucursal, saldo);
        }

        private async Task<CajasSaldo> ObtenerOCrearCajasSaldo(int idCuenta)
        {
            var saldo = await _db.CajasSaldos.FirstOrDefaultAsync(x => x.IdCuenta == idCuenta);
            if (saldo != null)
                return saldo;

            saldo = new CajasSaldo
            {
                IdCuenta = idCuenta,
                Saldo = 0
            };

            _db.CajasSaldos.Add(saldo);
            await _db.SaveChangesAsync();
            return saldo;
        }

        public async Task<bool> RegistrarCobro(
            int idCliente,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario)
        {
            if (importe <= 0)
                return false;

            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var ok = await RegistrarCobroSinTransaccion(
                    idCliente, idCuenta, fecha, concepto, importe, idUsuario, null);

                if (!ok)
                {
                    await trx.RollbackAsync();
                    return false;
                }

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RegistrarCobroSinTransaccion(
            int idCliente,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idEntrega = null)
        {
            if (importe <= 0)
                return false;

            var cc = await ObtenerOCrearCuentaCorriente(idCliente);
            var ahora = DateTime.Now;

            var cobro = new ClientesCobro
            {
                IdCliente = idCliente,
                IdCuentaCorriente = cc.Id,
                IdEntrega = idEntrega,
                IdCuenta = idCuenta,
                Fecha = fecha,
                Concepto = concepto,
                Importe = importe,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ClientesCobros.Add(cobro);
            await _db.SaveChangesAsync();

            var cajaSaldo = await ObtenerOCrearCajasSaldo(idCuenta);

            var cajaMov = new CajasMovimiento
            {
                IdCaja = cajaSaldo.Id,
                TipoMovimiento = TIPO_COBRO_CLIENTE,
                IdMovimiento = cobro.Id,
                Fecha = fecha,
                Concepto = $"Cobro cliente - {concepto}",
                Ingreso = importe,
                Egreso = 0,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.CajasMovimientos.Add(cajaMov);
            cajaSaldo.Saldo += importe;

            await _db.SaveChangesAsync();

            cobro.IdMovCaja = cajaMov.Id;

            var movCc = new ClientesCuentaCorrienteMovimiento
            {
                IdCuentaCorriente = cc.Id,
                TipoMovimiento = TIPO_COBRO_CLIENTE,
                IdMovimiento = cobro.Id,
                Fecha = fecha,
                Concepto = concepto,
                Debe = 0,
                Haber = importe,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ClientesCuentaCorrienteMovimientos.Add(movCc);
            cc.Saldo -= importe;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RegistrarAjuste(
            int idCliente,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario)
        {
            if (debe <= 0 && haber <= 0)
                return false;

            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var cc = await ObtenerOCrearCuentaCorriente(idCliente);
                var ahora = DateTime.Now;

                var movCc = new ClientesCuentaCorrienteMovimiento
                {
                    IdCuentaCorriente = cc.Id,
                    TipoMovimiento = TIPO_AJUSTE_CLIENTE,
                    IdMovimiento = 0,
                    Fecha = fecha,
                    Concepto = concepto,
                    Debe = debe,
                    Haber = haber,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.ClientesCuentaCorrienteMovimientos.Add(movCc);
                await _db.SaveChangesAsync();

                movCc.IdMovimiento = movCc.Id;

                if (idCuenta.HasValue && idCuenta > 0 && (debe > 0 || haber > 0))
                {
                    var cajaSaldo = await ObtenerOCrearCajasSaldo(idCuenta.Value);

                    var cajaMov = new CajasMovimiento
                    {
                        IdCaja = cajaSaldo.Id,
                        TipoMovimiento = TIPO_AJUSTE_CLIENTE,
                        IdMovimiento = movCc.Id,
                        Fecha = fecha,
                        Concepto = $"Ajuste cliente - {concepto}",
                        Ingreso = haber > 0 ? haber : 0,
                        Egreso = debe > 0 ? debe : 0,
                        IdUsuarioRegistra = idUsuario,
                        FechaUsuarioRegistra = ahora
                    };

                    _db.CajasMovimientos.Add(cajaMov);
                    cajaSaldo.Saldo += cajaMov.Ingreso - cajaMov.Egreso;
                }

                cc.Saldo += debe - haber;

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

        public async Task<bool> RegistrarInteres(
            int idCliente,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario)
        {
            if (importe <= 0)
                return false;

            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var cc = await ObtenerOCrearCuentaCorriente(idCliente);
                var ahora = DateTime.Now;

                var movCc = new ClientesCuentaCorrienteMovimiento
                {
                    IdCuentaCorriente = cc.Id,
                    TipoMovimiento = TIPO_INTERES_CLIENTE,
                    IdMovimiento = 0,
                    Fecha = fecha.Date,
                    Concepto = concepto,
                    Debe = importe,
                    Haber = 0,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.ClientesCuentaCorrienteMovimientos.Add(movCc);
                await _db.SaveChangesAsync();

                movCc.IdMovimiento = movCc.Id;
                cc.Saldo += importe;

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
                var ok = await EliminarSinTransaccion(idMovimiento);
                if (!ok)
                {
                    await trx.RollbackAsync();
                    return false;
                }

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> EliminarSinTransaccion(int idMovimiento)
        {
            try
            {
                var mov = await _db.ClientesCuentaCorrienteMovimientos
                    .Include(x => x.IdCuentaCorrienteNavigation)
                    .FirstOrDefaultAsync(x => x.Id == idMovimiento);

                if (mov == null)
                    return false;

                if (mov.TipoMovimiento != TIPO_COBRO_CLIENTE &&
                    mov.TipoMovimiento != TIPO_AJUSTE_CLIENTE &&
                    mov.TipoMovimiento != TIPO_INTERES_CLIENTE)
                    return false;

                var cc = mov.IdCuentaCorrienteNavigation;
                var delta = mov.Debe - mov.Haber;

                if (mov.TipoMovimiento == TIPO_COBRO_CLIENTE)
                {
                    var cobro = await _db.ClientesCobros
                        .FirstOrDefaultAsync(x => x.Id == mov.IdMovimiento);

                    if (cobro != null)
                    {
                        if (cobro.IdMovCaja.HasValue)
                        {
                            var cajaMov = await _db.CajasMovimientos
                                .Include(x => x.IdCajaNavigation)
                                .FirstOrDefaultAsync(x => x.Id == cobro.IdMovCaja.Value);

                            if (cajaMov != null)
                            {
                                cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                                _db.CajasMovimientos.Remove(cajaMov);
                            }
                        }

                        _db.ClientesCobros.Remove(cobro);
                    }
                }
                else if (mov.TipoMovimiento == TIPO_AJUSTE_CLIENTE)
                {
                    var cajaMov = await _db.CajasMovimientos
                        .Include(x => x.IdCajaNavigation)
                        .FirstOrDefaultAsync(x =>
                            x.TipoMovimiento == TIPO_AJUSTE_CLIENTE &&
                            x.IdMovimiento == mov.Id);

                    if (cajaMov != null)
                    {
                        cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                        _db.CajasMovimientos.Remove(cajaMov);
                    }
                }

                cc.Saldo -= delta;
                _db.ClientesCuentaCorrienteMovimientos.Remove(mov);

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
