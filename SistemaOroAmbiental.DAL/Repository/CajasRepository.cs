using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class CajasRepository : ICajasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public const string TIPO_INGRESO_MANUAL = "INGRESO MANUAL";
        public const string TIPO_EGRESO_MANUAL = "EGRESO MANUAL";
        public const string TIPO_TRANSFERENCIA = "TRANSFERENCIA";

        public CajasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        private IQueryable<CajasMovimiento> QueryBase()
            => _db.CajasMovimientos
                .AsNoTracking()
                .Include(x => x.IdCajaNavigation)
                    .ThenInclude(c => c.IdCuentaNavigation)
                        .ThenInclude(s => s.IdSucursalNavigation);

        private IQueryable<CajasMovimiento> AplicarFiltros(
            IQueryable<CajasMovimiento> query,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
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

            if (idCuenta.HasValue)
                query = query.Where(x => x.IdCajaNavigation.IdCuenta == idCuenta.Value);

            if (idSucursal.HasValue)
                query = query.Where(x => x.IdCajaNavigation.IdCuentaNavigation.IdSucursal == idSucursal.Value);

            if (!string.IsNullOrWhiteSpace(tipoMovimiento))
                query = query.Where(x => x.TipoMovimiento == tipoMovimiento);

            if (!string.IsNullOrWhiteSpace(texto))
                query = query.Where(x => x.Concepto.Contains(texto));

            return query;
        }

        public async Task<List<CajasMovimiento>> Movimientos(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto)
        {
            var query = AplicarFiltros(QueryBase(), fechaDesde, fechaHasta, idCuenta, idSucursal, tipoMovimiento, texto);

            return await query
                .OrderBy(x => x.Fecha)
                .ThenBy(x => x.Id)
                .ToListAsync();
        }

        public async Task<decimal> SaldoAnterior(
            DateTime? fechaDesde,
            int? idCuenta,
            int? idSucursal)
        {
            if (!fechaDesde.HasValue)
                return 0;

            var query = _db.CajasMovimientos
                .AsNoTracking()
                .Include(x => x.IdCajaNavigation)
                    .ThenInclude(c => c.IdCuentaNavigation)
                .Where(x => x.Fecha < fechaDesde.Value.Date);

            if (idCuenta.HasValue)
                query = query.Where(x => x.IdCajaNavigation.IdCuenta == idCuenta.Value);

            if (idSucursal.HasValue)
                query = query.Where(x => x.IdCajaNavigation.IdCuentaNavigation.IdSucursal == idSucursal.Value);

            return await query.SumAsync(x => x.Ingreso - x.Egreso);
        }

        public async Task<(decimal ingresos, decimal egresos, int cantidad)> Resumen(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto)
        {
            var query = AplicarFiltros(_db.CajasMovimientos.AsQueryable(), fechaDesde, fechaHasta, idCuenta, idSucursal, tipoMovimiento, texto);

            var ingresos = await query.SumAsync(x => x.Ingreso);
            var egresos = await query.SumAsync(x => x.Egreso);
            var cantidad = await query.CountAsync();

            return (ingresos, egresos, cantidad);
        }

        public async Task<CajasSaldo> ObtenerOCrearCajasSaldo(int idCuenta)
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

        private async Task AplicarDeltaSaldo(int idCaja, decimal delta)
        {
            var caja = await _db.CajasSaldos.FirstOrDefaultAsync(x => x.Id == idCaja);
            if (caja == null) return;
            caja.Saldo += delta;
            await _db.SaveChangesAsync();
        }

        public async Task<(CajasMovimiento? mov, decimal saldo, string origen, bool puedeEditar, bool puedeEliminar, string? tipoTransferencia)> ObtenerMovimiento(int id)
        {
            var mov = await _db.CajasMovimientos
                .Include(x => x.IdCajaNavigation)
                    .ThenInclude(c => c.IdCuentaNavigation)
                        .ThenInclude(s => s.IdSucursalNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (mov == null)
                return (null, 0, "", false, false, null);

            var idCuenta = mov.IdCajaNavigation.IdCuenta;

            var saldo = await _db.CajasMovimientos
                .Where(x => x.IdCajaNavigation.IdCuenta == idCuenta)
                .Where(x =>
                    x.Fecha < mov.Fecha ||
                    (x.Fecha == mov.Fecha && x.Id <= mov.Id))
                .SumAsync(x => x.Ingreso - x.Egreso);

            var origen = ObtenerOrigen(mov.TipoMovimiento);
            var puede = EsEditable(mov.TipoMovimiento);

            string? tipoTransferencia = null;
            if (mov.TipoMovimiento == TIPO_TRANSFERENCIA)
                tipoTransferencia = mov.Egreso > 0 ? "SALIDA" : "ENTRADA";

            return (mov, saldo, origen, puede, puede, tipoTransferencia);
        }

        public async Task<(CajasMovimiento? salida, CajasMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo)
        {
            var movimientos = await _db.CajasMovimientos
                .Include(x => x.IdCajaNavigation)
                    .ThenInclude(c => c.IdCuentaNavigation)
                .Where(x => x.TipoMovimiento == TIPO_TRANSFERENCIA && x.IdMovimiento == idMovimientoGrupo)
                .OrderBy(x => x.Id)
                .ToListAsync();

            var salida = movimientos.FirstOrDefault(x => x.Egreso > 0);
            var entrada = movimientos.FirstOrDefault(x => x.Ingreso > 0);

            return (salida, entrada);
        }

        public async Task<bool> RegistrarIngresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario)
        {
            if (importe <= 0) return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var caja = await ObtenerOCrearCajasSaldo(idCuenta);
                var ahora = DateTime.Now;

                var mov = new CajasMovimiento
                {
                    IdCaja = caja.Id,
                    TipoMovimiento = TIPO_INGRESO_MANUAL,
                    IdMovimiento = 0,
                    Fecha = fecha,
                    Concepto = concepto,
                    Ingreso = importe,
                    Egreso = 0,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.CajasMovimientos.Add(mov);
                caja.Saldo += importe;

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

        public async Task<bool> RegistrarEgresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario)
        {
            if (importe <= 0) return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var caja = await ObtenerOCrearCajasSaldo(idCuenta);
                var ahora = DateTime.Now;

                var mov = new CajasMovimiento
                {
                    IdCaja = caja.Id,
                    TipoMovimiento = TIPO_EGRESO_MANUAL,
                    IdMovimiento = 0,
                    Fecha = fecha,
                    Concepto = concepto,
                    Ingreso = 0,
                    Egreso = importe,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.CajasMovimientos.Add(mov);
                caja.Saldo -= importe;

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

        public async Task<bool> ActualizarMovimientoManual(int id, DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario)
        {
            if (importe <= 0) return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.CajasMovimientos
                    .Include(x => x.IdCajaNavigation)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (mov == null || !EsEditable(mov.TipoMovimiento))
                    return false;

                if (mov.TipoMovimiento != TIPO_INGRESO_MANUAL && mov.TipoMovimiento != TIPO_EGRESO_MANUAL)
                    return false;

                var deltaAnterior = mov.Ingreso - mov.Egreso;
                var cajaAnterior = mov.IdCajaNavigation;

                var nuevaCaja = await ObtenerOCrearCajasSaldo(idCuenta);
                var ahora = DateTime.Now;

                cajaAnterior.Saldo -= deltaAnterior;

                mov.IdCaja = nuevaCaja.Id;
                mov.Fecha = fecha;
                mov.Concepto = concepto;
                mov.IdUsuarioModifica = idUsuario;
                mov.FechaUsuarioModifica = ahora;

                if (mov.TipoMovimiento == TIPO_INGRESO_MANUAL)
                {
                    mov.Ingreso = importe;
                    mov.Egreso = 0;
                }
                else
                {
                    mov.Ingreso = 0;
                    mov.Egreso = importe;
                }

                var deltaNuevo = mov.Ingreso - mov.Egreso;
                nuevaCaja.Saldo += deltaNuevo;

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

        public async Task<bool> RegistrarTransferencia(
            DateTime fecha,
            int idCuentaOrigen,
            int idCuentaDestino,
            decimal importe,
            string notaInterna,
            int idUsuario)
        {
            if (importe <= 0 || idCuentaOrigen == idCuentaDestino)
                return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var cajaOrigen = await ObtenerOCrearCajasSaldo(idCuentaOrigen);
                var cajaDestino = await ObtenerOCrearCajasSaldo(idCuentaDestino);
                var ahora = DateTime.Now;
                var nota = (notaInterna ?? "").Trim();

                var salida = new CajasMovimiento
                {
                    IdCaja = cajaOrigen.Id,
                    TipoMovimiento = TIPO_TRANSFERENCIA,
                    IdMovimiento = 0,
                    Fecha = fecha,
                    Concepto = $"Transferencia salida{(string.IsNullOrEmpty(nota) ? "" : " - ")}{nota}",
                    Ingreso = 0,
                    Egreso = importe,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.CajasMovimientos.Add(salida);
                await _db.SaveChangesAsync();

                salida.IdMovimiento = salida.Id;

                var entrada = new CajasMovimiento
                {
                    IdCaja = cajaDestino.Id,
                    TipoMovimiento = TIPO_TRANSFERENCIA,
                    IdMovimiento = salida.Id,
                    Fecha = fecha,
                    Concepto = $"Transferencia entrada{(string.IsNullOrEmpty(nota) ? "" : " - ")}{nota}",
                    Ingreso = importe,
                    Egreso = 0,
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = ahora
                };

                _db.CajasMovimientos.Add(entrada);

                cajaOrigen.Saldo -= importe;
                cajaDestino.Saldo += importe;

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

        public async Task<bool> ActualizarTransferencia(
            int idMovimientoGrupo,
            DateTime fecha,
            int idCuentaOrigen,
            int idCuentaDestino,
            decimal importe,
            string notaInterna,
            int idUsuario)
        {
            if (importe <= 0 || idCuentaOrigen == idCuentaDestino)
                return false;

            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var movimientos = await _db.CajasMovimientos
                    .Include(x => x.IdCajaNavigation)
                    .Where(x => x.TipoMovimiento == TIPO_TRANSFERENCIA && x.IdMovimiento == idMovimientoGrupo)
                    .OrderBy(x => x.Id)
                    .ToListAsync();

                if (movimientos.Count != 2)
                    return false;

                foreach (var m in movimientos)
                    m.IdCajaNavigation.Saldo -= (m.Ingreso - m.Egreso);

                _db.CajasMovimientos.RemoveRange(movimientos);
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }

            return await RegistrarTransferencia(fecha, idCuentaOrigen, idCuentaDestino, importe, notaInterna, idUsuario);
        }

        public async Task<bool> Eliminar(int id, int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var mov = await _db.CajasMovimientos
                    .Include(x => x.IdCajaNavigation)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (mov == null)
                    return false;

                if (!EsEditable(mov.TipoMovimiento))
                {
                    throw new InvalidOperationException(
                        "No se pudo eliminar este movimiento de caja. Solo se pueden eliminar ingresos/egresos manuales o transferencias.");
                }

                if (mov.TipoMovimiento == TIPO_TRANSFERENCIA)
                {
                    var idGrupo = mov.IdMovimiento > 0 ? mov.IdMovimiento : mov.Id;

                    var movimientos = await _db.CajasMovimientos
                        .Include(x => x.IdCajaNavigation)
                        .Where(x => x.TipoMovimiento == TIPO_TRANSFERENCIA && x.IdMovimiento == idGrupo)
                        .ToListAsync();

                    foreach (var m in movimientos)
                        m.IdCajaNavigation.Saldo -= (m.Ingreso - m.Egreso);

                    _db.CajasMovimientos.RemoveRange(movimientos);
                }
                else
                {
                    mov.IdCajaNavigation.Saldo -= (mov.Ingreso - mov.Egreso);
                    _db.CajasMovimientos.Remove(mov);
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

        private static bool EsEditable(string tipo)
            => tipo == TIPO_INGRESO_MANUAL
                || tipo == TIPO_EGRESO_MANUAL
                || tipo == TIPO_TRANSFERENCIA;

        private static string ObtenerOrigen(string tipo) => tipo switch
        {
            TIPO_INGRESO_MANUAL => "MANUAL",
            TIPO_EGRESO_MANUAL => "MANUAL",
            TIPO_TRANSFERENCIA => "TRANSFERENCIA",
            "COBRO CLIENTE" => "CLIENTES",
            "PAGO PROVEEDOR" => "PROVEEDORES",
            "GASTO" => "GASTOS",
            _ => "SISTEMA"
        };
    }
}
