using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class CamionesService : ICamionesService
    {
        private readonly ICamionesRepository _repo;
        private readonly IDeleteConflictChecker _deleteChecker;

        public CamionesService(ICamionesRepository repo, IDeleteConflictChecker deleteChecker)
        {
            _repo = repo;
            _deleteChecker = deleteChecker;
        }

        public async Task<ServiceResult> Insertar(Camion model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.Insertar(model);

            return ok
                ? ServiceResult.Success("Camión registrado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public async Task<ServiceResult> Actualizar(Camion model)
        {
            if (!ValidarModelo(model, out var error))
                return ServiceResult.Error(error, "validacion");

            var ok = await _repo.Actualizar(model);

            return ok
                ? ServiceResult.Success("Camión modificado correctamente")
                : ServiceResult.Error("No se pudo guardar");
        }

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el camión",
                "Camión eliminado correctamente",
                id,
                () => _deleteChecker.CamionAsync(id));

        public Task<Camion?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<IQueryable<Camion>> ObtenerTodos(bool soloActivos = false)
            => _repo.ObtenerTodos(soloActivos);

        public async Task<ServiceResult> CambiarActivo(int id, bool activo)
        {
            if (id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            var ok = await _repo.CambiarActivo(id, activo);
            return ok
                ? ServiceResult.Success(activo ? "Camión activado." : "Camión desactivado.")
                : ServiceResult.Error("No se pudo actualizar el estado.");
        }

        private static bool ValidarModelo(Camion model, out string error)
        {
            if (string.IsNullOrWhiteSpace(model.Nombre))
            {
                error = "Debe completar los campos obligatorios.";
                return false;
            }

            error = "";
            return true;
        }
    }
}
