using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class GastosRepository : IGastosRepository
    {
        private const string TipoMovimientoGasto = "GASTO";

        private readonly SistemaOroAmbientalContext _db;

        public GastosRepository(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public async Task<bool> Insertar(Gasto model, int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ahora = DateTime.Now;
                model.IdUsuarioRegistra = idUsuario;
                model.FechaUsuarioRegistra = ahora;
                model.IdMovCaja = null;

                _db.Gastos.Add(model);
                await _db.SaveChangesAsync();

                await CrearMovimientoCajaAsync(model, idUsuario, ahora);
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

        public async Task<bool> Actualizar(Gasto model, int idUsuario)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var entity = await _db.Gastos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                await RevertirMovimientoCajaAsync(entity);

                entity.Fecha = model.Fecha;
                entity.IdCategoria = model.IdCategoria;
                entity.IdCuenta = model.IdCuenta;
                entity.NumReferencia = model.NumReferencia;
                entity.Concepto = model.Concepto;
                entity.ImporteNeto = model.ImporteNeto;
                entity.PorcIva = model.PorcIva;
                entity.TotalIva = model.TotalIva;
                entity.OtrosImpuestos = model.OtrosImpuestos;
                entity.ImporteTotal = model.ImporteTotal;
                entity.NotaInterna = model.NotaInterna;
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = DateTime.Now;
                entity.IdMovCaja = null;

                await _db.SaveChangesAsync();

                var ahora = DateTime.Now;
                await CrearMovimientoCajaAsync(entity, idUsuario, ahora);
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

        public async Task<bool> Eliminar(int id)
        {
            await using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var entity = await _db.Gastos.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return false;

                await RevertirMovimientoCajaAsync(entity);
                _db.Gastos.Remove(entity);
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

        public async Task<Gasto?> Obtener(int id)
        {
            return await _db.Gastos
                .Include(x => x.IdCategoriaNavigation)
                .Include(x => x.IdCuentaNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<List<Gasto>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCategoria,
            int? idCuenta,
            int? idSucursal,
            string? concepto,
            decimal? importeMin)
        {
            IQueryable<Gasto> query = _db.Gastos
                .AsNoTracking()
                .Include(x => x.IdCategoriaNavigation)
                .Include(x => x.IdCuentaNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation);

            if (fechaDesde.HasValue)
                query = query.Where(x => x.Fecha >= fechaDesde.Value);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(x => x.Fecha <= hasta);
            }

            if (idCategoria.HasValue)
                query = query.Where(x => x.IdCategoria == idCategoria.Value);

            if (idCuenta.HasValue)
                query = query.Where(x => x.IdCuenta == idCuenta.Value);

            if (idSucursal.HasValue)
                query = query.Where(x => x.IdCuentaNavigation.IdSucursal == idSucursal.Value);

            if (!string.IsNullOrWhiteSpace(concepto))
                query = query.Where(x => x.Concepto.Contains(concepto));

            if (importeMin.HasValue)
                query = query.Where(x => x.ImporteTotal >= importeMin.Value);

            return await query
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
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

        private async Task RevertirMovimientoCajaAsync(Gasto gasto)
        {
            if (!gasto.IdMovCaja.HasValue)
                return;

            var mov = await _db.CajasMovimientos
                .FirstOrDefaultAsync(x => x.Id == gasto.IdMovCaja.Value);

            if (mov == null)
            {
                gasto.IdMovCaja = null;
                return;
            }

            var caja = await _db.CajasSaldos.FirstOrDefaultAsync(x => x.Id == mov.IdCaja);
            if (caja != null)
                caja.Saldo += mov.Egreso;

            _db.CajasMovimientos.Remove(mov);
            gasto.IdMovCaja = null;
            await _db.SaveChangesAsync();
        }

        private async Task CrearMovimientoCajaAsync(Gasto gasto, int idUsuario, DateTime ahora)
        {
            if (gasto.ImporteTotal <= 0)
                return;

            var cajaSaldo = await ObtenerOCrearCajasSaldo(gasto.IdCuenta);
            var conceptoCaja = $"Gasto - {gasto.Concepto}";
            if (conceptoCaja.Length > 200)
                conceptoCaja = conceptoCaja[..200];

            var cajaMov = new CajasMovimiento
            {
                IdCaja = cajaSaldo.Id,
                TipoMovimiento = TipoMovimientoGasto,
                IdMovimiento = gasto.Id,
                Fecha = gasto.Fecha,
                Concepto = conceptoCaja,
                Ingreso = 0,
                Egreso = gasto.ImporteTotal,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = ahora
            };

            _db.CajasMovimientos.Add(cajaMov);
            cajaSaldo.Saldo -= gasto.ImporteTotal;
            await _db.SaveChangesAsync();

            gasto.IdMovCaja = cajaMov.Id;
        }
    }
}
