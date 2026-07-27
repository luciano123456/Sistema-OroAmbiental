using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ContratosRepository : IContratosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ContratosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<Contrato>> ListarFiltrado(int? idCliente, bool? soloVigentes, string? texto)
        {
            var query = _db.Contratos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                .Include(x => x.IdTipoContratoNavigation)
                .AsQueryable();

            if (idCliente.HasValue && idCliente > 0)
                query = query.Where(x => x.IdCliente == idCliente.Value);

            if (soloVigentes == true)
            {
                var hoy = DateTime.Today;
                query = query.Where(x => x.FechaVencimiento >= hoy);
            }

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                query = query.Where(x =>
                    x.IdClienteNavigation.Nombre.Contains(t) ||
                    x.IdEstablecimientoNavigation.Nombre.Contains(t));
            }

            return await query
                .OrderByDescending(x => x.FechaContrato)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task<IQueryable<Contrato>> ObtenerTodos()
        {
            return _db.Contratos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                .Include(x => x.IdTipoContratoNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .OrderByDescending(x => x.FechaContrato)
                .ThenByDescending(x => x.Id);
        }

        public async Task<Contrato?> Obtener(int id)
        {
            return await _db.Contratos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(c => c.IdSucursalNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                    .ThenInclude(e => e.IdProvinciaNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                    .ThenInclude(e => e.IdDiaRecoleccionNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                    .ThenInclude(e => e.IdSemanaRecoleccionNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                    .ThenInclude(e => e.IdCondicionIvaNavigation)
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(c => c.IdProvinciaNavigation)
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(c => c.IdCondicionIvaNavigation)
                .Include(x => x.IdClienteNavigation)
                    .ThenInclude(c => c.IdProfesionNavigation)
                .Include(x => x.IdTipoContratoNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<Contrato?> BuscarDuplicado(int? idExcluir, int idCliente, int idEstablecimiento)
        {
            var query = _db.Contratos
                .AsNoTracking()
                .Where(x => x.IdCliente == idCliente && x.IdEstablecimiento == idEstablecimiento);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<bool> TieneEntregas(int id)
            => await _db.ClientesEntregas.AnyAsync(x => x.IdContrato == id);

        public async Task<bool> Insertar(Contrato model)
        {
            try
            {
                _db.Contratos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(Contrato model)
        {
            try
            {
                var entity = await _db.Contratos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null) return false;

                entity.IdCliente = model.IdCliente;
                entity.IdEstablecimiento = model.IdEstablecimiento;
                entity.IdTipoContrato = model.IdTipoContrato;
                entity.FechaContrato = model.FechaContrato;
                entity.FechaInicio = model.FechaInicio;
                entity.FechaVencimiento = model.FechaVencimiento;
                entity.IdUsuarioModifica = model.IdUsuarioModifica;
                entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var entity = await _db.Contratos.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null) return false;

                if (await TieneEntregas(id))
                    throw new InvalidOperationException("ENTREGAS");

                var renovaciones = await _db.ContratosRenovaciones
                    .Where(x => x.IdContrato == id)
                    .ToListAsync();

                _db.ContratosRenovaciones.RemoveRange(renovaciones);
                _db.Contratos.Remove(entity);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ActualizarVencimientoSiMayor(int idContrato, DateTime fechaVencimiento)
        {
            var entity = await _db.Contratos.FirstOrDefaultAsync(x => x.Id == idContrato);
            if (entity == null) return false;

            if (fechaVencimiento > entity.FechaVencimiento)
            {
                entity.FechaVencimiento = fechaVencimiento;
                await _db.SaveChangesAsync();
            }

            return true;
        }
    }
}
