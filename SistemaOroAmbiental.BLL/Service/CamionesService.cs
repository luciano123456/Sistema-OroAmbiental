using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class CamionesService : ICamionesService
    {
        private readonly ICamionesRepository _repo;
        private readonly ICatalogoCascadeRepository _cascade;

        public CamionesService(ICamionesRepository repo, ICatalogoCascadeRepository cascade)
        {
            _repo = repo;
            _cascade = cascade;
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

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascade.ObtenerDependenciasAsync<Camion>(id);

        public async Task<ServiceResult> Eliminar(int id, bool cascada = false)
        {
            var deps = await _cascade.ObtenerDependenciasAsync<Camion>(id);

            if (deps.TieneDependencias && !cascada)
            {
                return new ServiceResult
                {
                    Ok = false,
                    Mensaje = deps.MensajeResumen,
                    Tipo = "dependencias",
                    IdReferencia = id,
                    Dependencias = deps,
                    InstruccionesPasoAPaso = deps.InstruccionesPasoAPaso
                };
            }

            if (deps.TieneDependencias && cascada)
            {
                if (!deps.PermiteCascada)
                    return ServiceResult.Error(deps.MensajeResumen, "relacion", id);

                try
                {
                    await _cascade.EliminarEnCascadaAsync<Camion>(id);
                    return ServiceResult.Success(
                        "Camión eliminado. Los registros asociados se desvincularon o se quitaron.");
                }
                catch (InvalidOperationException ex)
                {
                    return ServiceResult.Error(ex.Message, "relacion", id);
                }
                catch (Exception)
                {
                    return ServiceResult.Error("Error inesperado al eliminar el camión en cascada.", "error", id);
                }
            }

            return await DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el camión",
                "Camión eliminado correctamente",
                id);
        }

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
