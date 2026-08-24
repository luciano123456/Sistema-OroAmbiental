using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class LocalidadesService : ILocalidadesService
    {
        private readonly ILocalidadesRepository _repo;
        private readonly ICatalogoCascadeRepository _cascade;

        public LocalidadesService(ILocalidadesRepository repo, ICatalogoCascadeRepository cascade)
        {
            _repo = repo;
            _cascade = cascade;
        }

        public Task<bool> Actualizar(Localidad model) => _repo.Actualizar(model);
        public Task<bool> Insertar(Localidad model) => _repo.Insertar(model);
        public Task<Localidad?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Localidad>> ObtenerTodos() => _repo.ObtenerTodos();
        public Task<IQueryable<Localidad>> ObtenerPorProvincia(int idProvincia) => _repo.ObtenerPorProvincia(idProvincia);
        public Task<IQueryable<Localidad>> ObtenerPorPartido(int idPartido) => _repo.ObtenerPorPartido(idPartido);

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascade.ObtenerDependenciasAsync<Localidad>(id);

        public async Task<ServiceResult> Eliminar(int id, bool cascada = false)
        {
            var deps = await _cascade.ObtenerDependenciasAsync<Localidad>(id);

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
                    await _cascade.EliminarEnCascadaAsync<Localidad>(id);
                    return ServiceResult.Success(
                        "Localidad eliminada. Los registros asociados se desvincularon.");
                }
                catch (InvalidOperationException ex)
                {
                    return ServiceResult.Error(ex.Message, "relacion", id);
                }
                catch (Exception)
                {
                    return ServiceResult.Error("Error inesperado al eliminar la localidad en cascada.", "error", id);
                }
            }

            return await DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "la localidad",
                "Localidad eliminada correctamente",
                id);
        }
    }
}
