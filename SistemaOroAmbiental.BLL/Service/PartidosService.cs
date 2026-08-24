using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class PartidosService : IPartidosService
    {
        private readonly IPartidosRepository _repo;
        private readonly ICatalogoCascadeRepository _cascade;

        public PartidosService(IPartidosRepository repo, ICatalogoCascadeRepository cascade)
        {
            _repo = repo;
            _cascade = cascade;
        }

        public Task<bool> Actualizar(Partido model) => _repo.Actualizar(model);
        public Task<bool> Insertar(Partido model) => _repo.Insertar(model);
        public Task<Partido?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Partido>> ObtenerTodos() => _repo.ObtenerTodos();
        public Task<IQueryable<Partido>> ObtenerPorProvincia(int idProvincia) => _repo.ObtenerPorProvincia(idProvincia);

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascade.ObtenerDependenciasAsync<Partido>(id);

        public async Task<ServiceResult> Eliminar(int id, bool cascada = false)
        {
            var deps = await _cascade.ObtenerDependenciasAsync<Partido>(id);

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
                    await _cascade.EliminarEnCascadaAsync<Partido>(id);
                    return ServiceResult.Success(
                        "Partido eliminado. Los registros asociados se desvincularon.");
                }
                catch (InvalidOperationException ex)
                {
                    return ServiceResult.Error(ex.Message, "relacion", id);
                }
                catch (Exception)
                {
                    return ServiceResult.Error("Error inesperado al eliminar el partido en cascada.", "error", id);
                }
            }

            return await DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el partido",
                "Partido eliminado correctamente",
                id);
        }
    }
}
