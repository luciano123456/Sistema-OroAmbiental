using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ChoferesService : IChoferesService
    {
        private readonly IChoferesRepository _repo;
        private readonly IEntidadCascadeRepository _cascadeRepo;

        public ChoferesService(IChoferesRepository repo, IEntidadCascadeRepository cascadeRepo)
        {
            _repo = repo;
            _cascadeRepo = cascadeRepo;
        }

        public async Task<ServiceResult> Insertar(Chofer model)
        {
            if (!Validar(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.Insertar(model);
            return ok
                ? ServiceResult.Success("Chofer registrado correctamente.")
                : ServiceResult.Error("No se pudo guardar.");
        }

        public async Task<ServiceResult> Actualizar(Chofer model)
        {
            if (model.Id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            if (!Validar(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.Actualizar(model);
            return ok
                ? ServiceResult.Success("Chofer modificado correctamente.")
                : ServiceResult.Error("No se pudo guardar.");
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasChoferAsync(id);

        public Task<ServiceResult> Eliminar(int id, bool cascada = false)
            => DeleteOperationHelper.ExecuteCascadeAsync(
                id,
                cascada,
                "el chofer",
                () => _cascadeRepo.ObtenerDependenciasChoferAsync(id),
                () => _cascadeRepo.EliminarChoferEnCascadaAsync(id),
                () => DeleteOperationHelper.ExecuteAsync(
                    () => _repo.Eliminar(id),
                    "el chofer",
                    "Chofer eliminado correctamente",
                    id),
                "Chofer eliminado correctamente.",
                "Error inesperado al eliminar el chofer en cascada.");

        public Task<Chofer?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Chofer>> ObtenerTodos(bool soloActivos = false)
            => _repo.ObtenerTodos(soloActivos);

        public async Task<ServiceResult> CambiarActivo(int id, bool activo)
        {
            if (id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            var ok = await _repo.CambiarActivo(id, activo);
            return ok
                ? ServiceResult.Success(activo ? "Chofer activado." : "Chofer desactivado.")
                : ServiceResult.Error("No se pudo actualizar el estado.");
        }

        private static bool Validar(Chofer model, out string error)
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
