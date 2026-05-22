using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ContratosRenovacionesRepository : IContratosRenovacionesRepository
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IContratosRepository _contratosRepo;

        public ContratosRenovacionesRepository(
            SistemaOroAmbientalContext context,
            IContratosRepository contratosRepo)
        {
            _db = context;
            _contratosRepo = contratosRepo;
        }

        public async Task<List<ContratosRenovacion>> ObtenerPorContrato(int idContrato)
            => await _db.ContratosRenovaciones
                .AsNoTracking()
                .Where(x => x.IdContrato == idContrato)
                .OrderByDescending(x => x.FechaInicio)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

        public async Task<ContratosRenovacion?> Obtener(int id)
            => await _db.ContratosRenovaciones
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<(bool Ok, string? Error)> Insertar(ContratosRenovacion model)
        {
            try
            {
                _db.ContratosRenovaciones.Add(model);
                await _db.SaveChangesAsync();
                await _contratosRepo.ActualizarVencimientoSiMayor(model.IdContrato, model.FechaVencimiento);
                return (true, null);
            }
            catch (Exception ex)
            {
                return (false, ObtenerMensajeError(ex));
            }
        }

        public async Task<(bool Ok, string? Error)> Actualizar(ContratosRenovacion model)
        {
            try
            {
                var entity = await _db.ContratosRenovaciones.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null) return (false, "Renovación no encontrada.");

                entity.Tipo = model.Tipo;
                entity.FechaInicio = model.FechaInicio;
                entity.FechaVencimiento = model.FechaVencimiento;
                entity.IdUsuarioModifica = model.IdUsuarioModifica;
                entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

                await _db.SaveChangesAsync();
                await _contratosRepo.ActualizarVencimientoSiMayor(entity.IdContrato, entity.FechaVencimiento);
                return (true, null);
            }
            catch (Exception ex)
            {
                return (false, ObtenerMensajeError(ex));
            }
        }

        private static string ObtenerMensajeError(Exception ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            if (inner.Contains("ContratosRenovaciones", StringComparison.OrdinalIgnoreCase)
                || inner.Contains("invalid object name", StringComparison.OrdinalIgnoreCase))
                return "La tabla de renovaciones no existe en la base de datos. Ejecute las migraciones o scripts pendientes.";
            return inner;
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                var entity = await _db.ContratosRenovaciones.FindAsync(id);
                if (entity == null) return false;

                var idContrato = entity.IdContrato;
                _db.ContratosRenovaciones.Remove(entity);
                await _db.SaveChangesAsync();

                var maxVenc = await _db.ContratosRenovaciones
                    .Where(x => x.IdContrato == idContrato)
                    .MaxAsync(x => (DateTime?)x.FechaVencimiento);

                var contrato = await _db.Contratos.FirstAsync(x => x.Id == idContrato);
                if (maxVenc.HasValue && maxVenc.Value > contrato.FechaVencimiento)
                    contrato.FechaVencimiento = maxVenc.Value;
                else if (!maxVenc.HasValue)
                {
                    // sin renovaciones: mantener vencimiento del contrato
                }

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
