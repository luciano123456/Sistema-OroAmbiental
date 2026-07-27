using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProveedoresCuentaCorrienteRepository : IProveedoresCuentaCorrienteRepository
    {
        public const string TIPO_PAGO_PROVEEDOR = "PAGO PROVEEDOR";
        public const string TIPO_AJUSTE_PROVEEDOR = "AJUSTE PROVEEDOR";
        public const string TIPO_COMPRA = "COMPRA";

        private readonly SistemaOroAmbientalContext _db;

        public ProveedoresCuentaCorrienteRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<(Proveedore proveedor, decimal saldo)>> ListarProveedores(string? buscar, bool soloSaldoActivo)
        {
            var query = _db.Proveedores.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(buscar))
                query = query.Where(x => x.Nombre.Contains(buscar));

            var proveedores = await query.OrderBy(x => x.Nombre).ToListAsync();
            var ids = proveedores.Select(x => x.Id).ToList();

            var saldos = await _db.ProveedoresCuentaCorrientes
                .AsNoTracking()
                .Where(x => ids.Contains(x.IdProveedor))
                .ToDictionaryAsync(x => x.IdProveedor, x => x.Saldo);

            var lista = proveedores
                .Select(p => (
                    proveedor: p,
                    saldo: saldos.TryGetValue(p.Id, out var s) ? s : 0m
                ))
                .ToList();

            if (soloSaldoActivo)
                lista = lista.Where(x => x.saldo != 0).ToList();

            return lista;
        }

        public async Task<ProveedoresCuentaCorriente> ObtenerOCrearCuentaCorriente(int idProveedor)
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

        private IQueryable<ProveedoresCuentaCorrienteMovimiento> QueryMovimientosProveedor(int idProveedor)
            => _db.ProveedoresCuentaCorrienteMovimientos
                .AsNoTracking()
                .Include(x => x.IdCuentaCorrienteNavigation)
                .Where(x => x.IdCuentaCorrienteNavigation.IdProveedor == idProveedor);

        private static IQueryable<ProveedoresCuentaCorrienteMovimiento> AplicarFiltroTipo(
            IQueryable<ProveedoresCuentaCorrienteMovimiento> query,
            string? tipoMovimiento)
        {
            if (string.IsNullOrWhiteSpace(tipoMovimiento))
                return query;

            var t = tipoMovimiento.Trim().ToUpperInvariant();

            return t switch
            {
                "PAGO" => query.Where(x => x.TipoMovimiento == TIPO_PAGO_PROVEEDOR),
                "AJUSTE" => query.Where(x => x.TipoMovimiento == TIPO_AJUSTE_PROVEEDOR),
                "COMPRA" => query.Where(x => x.TipoMovimiento == TIPO_COMPRA),
                _ => query.Where(x => x.TipoMovimiento == tipoMovimiento)
            };
        }

        public async Task<List<ProveedoresCuentaCorrienteMovimiento>> Movimientos(
            int idProveedor,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            var query = QueryMovimientosProveedor(idProveedor);

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

        public async Task<decimal> SaldoAnterior(int idProveedor, DateTime? fechaDesde)
        {
            if (!fechaDesde.HasValue)
                return 0;

            return await QueryMovimientosProveedor(idProveedor)
                .Where(x => x.Fecha < fechaDesde.Value.Date)
                .SumAsync(x => x.Debe - x.Haber);
        }

        public async Task<(decimal debe, decimal haber, int cantidad)> Resumen(
            int idProveedor,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
        {
            var query = QueryMovimientosProveedor(idProveedor);

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

        public async Task<(ProveedoresCuentaCorrienteMovimiento? mov, string? cuenta, string? sucursal, decimal saldo)> ObtenerMovimiento(int id)
        {
            var mov = await _db.ProveedoresCuentaCorrienteMovimientos
                .AsNoTracking()
                .Include(x => x.IdCuentaCorrienteNavigation)
                    .ThenInclude(cc => cc.IdProveedorNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (mov == null)
                return (null, null, null, 0);

            string? cuenta = null;
            string? sucursal = null;

            if (mov.TipoMovimiento == TIPO_PAGO_PROVEEDOR)
            {
                var pago = await _db.ProveedoresPagos
                    .AsNoTracking()
                    .Include(x => x.IdCuentaNavigation)
                        .ThenInclude(c => c.IdSucursalNavigation)
                    .FirstOrDefaultAsync(x => x.Id == mov.IdMovimiento);

                cuenta = pago?.IdCuentaNavigation?.Nombre;
                sucursal = pago?.IdCuentaNavigation?.IdSucursalNavigation?.Nombre;
            }
            else if (mov.TipoMovimiento == TIPO_AJUSTE_PROVEEDOR)
            {
                var cajaMov = await _db.CajasMovimientos
                    .AsNoTracking()
                    .Include(x => x.IdCajaNavigation)
                        .ThenInclude(c => c.IdCuentaNavigation)
                            .ThenInclude(cu => cu.IdSucursalNavigation)
                    .FirstOrDefaultAsync(x =>
                        x.TipoMovimiento == TIPO_AJUSTE_PROVEEDOR &&
                        x.IdMovimiento == mov.Id);

                cuenta = cajaMov?.IdCajaNavigation?.IdCuentaNavigation?.Nombre;
                sucursal = cajaMov?.IdCajaNavigation?.IdCuentaNavigation?.IdSucursalNavigation?.Nombre;
            }

            var idProveedor = mov.IdCuentaCorrienteNavigation.IdProveedor;

            var saldo = await _db.ProveedoresCuentaCorrienteMovimientos
                .Where(x => x.IdCuentaCorrienteNavigation.IdProveedor == idProveedor)
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

        public async Task<bool> RegistrarPago(
            int idProveedor,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idCompra = null)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();

            try
            {
                var ok = await RegistrarPagoSinTransaccion(
                    idProveedor, idCuenta, fecha, concepto, importe, idUsuario, idCompra);

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

        public async Task<bool> RegistrarPagoSinTransaccion(
            int idProveedor,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idCompra = null)
        {
            if (importe <= 0)
                return false;

            var cc = await ObtenerOCrearCuentaCorriente(idProveedor);
            var ahora = DateTime.Now;

            var pago = new ProveedoresPago
            {
                IdProveedor = idProveedor,
                IdCuentaCorriente = cc.Id,
                IdCompra = idCompra,
                IdCuenta = idCuenta,
                Fecha = fecha,
                Concepto = concepto,
                Importe = importe,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ProveedoresPagos.Add(pago);
            await _db.SaveChangesAsync();

            var cajaSaldo = await ObtenerOCrearCajasSaldo(idCuenta);

            var cajaMov = new CajasMovimiento
            {
                IdCaja = cajaSaldo.Id,
                TipoMovimiento = TIPO_PAGO_PROVEEDOR,
                IdMovimiento = pago.Id,
                Fecha = fecha,
                Concepto = $"Pago proveedor - {concepto}",
                Ingreso = 0,
                Egreso = importe,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.CajasMovimientos.Add(cajaMov);
            cajaSaldo.Saldo -= importe;

            await _db.SaveChangesAsync();

            pago.IdMovCaja = cajaMov.Id;

            var movCc = new ProveedoresCuentaCorrienteMovimiento
            {
                IdCuentaCorriente = cc.Id,
                TipoMovimiento = TIPO_PAGO_PROVEEDOR,
                IdMovimiento = pago.Id,
                Fecha = fecha,
                Concepto = concepto,
                Debe = 0,
                Haber = importe,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.ProveedoresCuentaCorrienteMovimientos.Add(movCc);
            cc.Saldo -= importe;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RegistrarAjuste(
            int idProveedor,
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
                var cc = await ObtenerOCrearCuentaCorriente(idProveedor);
                var ahora = DateTime.Now;

                var movCc = new ProveedoresCuentaCorrienteMovimiento
                {
                    IdCuentaCorriente = cc.Id,
                    TipoMovimiento = TIPO_AJUSTE_PROVEEDOR,
                    IdMovimiento = 0,
                    Fecha = fecha,
                    Concepto = concepto,
                    Debe = debe,
                    Haber = haber,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.ProveedoresCuentaCorrienteMovimientos.Add(movCc);
                await _db.SaveChangesAsync();

                movCc.IdMovimiento = movCc.Id;

                if (idCuenta.HasValue && idCuenta > 0 && (debe > 0 || haber > 0))
                {
                    var cajaSaldo = await ObtenerOCrearCajasSaldo(idCuenta.Value);

                    var cajaMov = new CajasMovimiento
                    {
                        IdCaja = cajaSaldo.Id,
                        TipoMovimiento = TIPO_AJUSTE_PROVEEDOR,
                        IdMovimiento = movCc.Id,
                        Fecha = fecha,
                        Concepto = $"Ajuste proveedor - {concepto}",
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
                var mov = await _db.ProveedoresCuentaCorrienteMovimientos
                    .Include(x => x.IdCuentaCorrienteNavigation)
                    .FirstOrDefaultAsync(x => x.Id == idMovimiento);

                if (mov == null)
                    return false;

                if (mov.TipoMovimiento != TIPO_PAGO_PROVEEDOR &&
                    mov.TipoMovimiento != TIPO_AJUSTE_PROVEEDOR)
                    return false;

                var cc = mov.IdCuentaCorrienteNavigation;
                var delta = mov.Debe - mov.Haber;

                if (mov.TipoMovimiento == TIPO_PAGO_PROVEEDOR)
                {
                    var pago = await _db.ProveedoresPagos
                        .FirstOrDefaultAsync(x => x.Id == mov.IdMovimiento);

                    if (pago != null)
                    {
                        if (pago.IdMovCaja.HasValue)
                        {
                            var cajaMov = await _db.CajasMovimientos
                                .Include(x => x.IdCajaNavigation)
                                .FirstOrDefaultAsync(x => x.Id == pago.IdMovCaja.Value);

                            if (cajaMov != null)
                            {
                                cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                                _db.CajasMovimientos.Remove(cajaMov);
                            }
                        }

                        _db.ProveedoresPagos.Remove(pago);
                    }
                }
                else if (mov.TipoMovimiento == TIPO_AJUSTE_PROVEEDOR)
                {
                    var cajaMov = await _db.CajasMovimientos
                        .Include(x => x.IdCajaNavigation)
                        .FirstOrDefaultAsync(x =>
                            x.TipoMovimiento == TIPO_AJUSTE_PROVEEDOR &&
                            x.IdMovimiento == mov.Id);

                    if (cajaMov != null)
                    {
                        cajaMov.IdCajaNavigation.Saldo -= (cajaMov.Ingreso - cajaMov.Egreso);
                        _db.CajasMovimientos.Remove(cajaMov);
                    }
                }

                cc.Saldo -= delta;
                _db.ProveedoresCuentaCorrienteMovimientos.Remove(mov);

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
