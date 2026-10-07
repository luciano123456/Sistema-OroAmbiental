using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class FirmasService : IFirmasService
    {
        private readonly IFirmasRepository _repo;
        private readonly IEntidadCascadeRepository _cascadeRepo;

        public FirmasService(IFirmasRepository repo, IEntidadCascadeRepository cascadeRepo)
        {
            _repo = repo;
            _cascadeRepo = cascadeRepo;
        }

        public async Task<ServiceResult> Insertar(Firma model)
        {
            if (!Validar(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.Insertar(model);
            return ok
                ? ServiceResult.Success("Firma registrada correctamente.")
                : ServiceResult.Error("No se pudo guardar.");
        }

        public async Task<ServiceResult> Actualizar(Firma model)
        {
            if (model.Id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            if (!Validar(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Firma modificada correctamente.")
                : ServiceResult.Error("No se pudo guardar.");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasFirmaAsync(id);

        public Task<ServiceResult> Eliminar(int id, bool cascada = false)
            => DeleteOperationHelper.ExecuteCascadeAsync(
                id,
                cascada,
                "la firma",
                () => _cascadeRepo.ObtenerDependenciasFirmaAsync(id),
                () => _cascadeRepo.EliminarFirmaEnCascadaAsync(id),
                () => DeleteOperationHelper.ExecuteAsync(
                    () => _repo.Eliminar(id),
                    "la firma",
                    "Firma eliminada correctamente",
                    id),
                "Firma eliminada correctamente.",
                "Error inesperado al eliminar la firma en cascada.");

        public Task<Firma?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Firma>> ObtenerTodos(bool soloActivos = false)
            => _repo.ObtenerTodos(soloActivos);

        public async Task<ServiceResult> CambiarActivo(int id, bool activo)
        {
            if (id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            var ok = await _repo.CambiarActivo(id, activo);
            return ok
                ? ServiceResult.Success(activo ? "Firma activada." : "Firma desactivada.")
                : ServiceResult.Error("No se pudo actualizar el estado.");
        }

        private static bool Validar(Firma model, out string error)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre))
            {
                error = "El nombre es obligatorio.";
                return false;
            }

            error = "";
            return true;
        }
    }
}
