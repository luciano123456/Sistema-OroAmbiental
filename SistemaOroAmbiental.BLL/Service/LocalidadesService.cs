using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class LocalidadesService : ILocalidadesService
    {
        private readonly ILocalidadesRepository _repo;
        private readonly IDeleteConflictChecker _deleteChecker;

        public LocalidadesService(ILocalidadesRepository repo, IDeleteConflictChecker deleteChecker)
        {
            _repo = repo;
            _deleteChecker = deleteChecker;
        }

        public Task<bool> Actualizar(Localidad model) => _repo.Actualizar(model);
        public Task<bool> Insertar(Localidad model) => _repo.Insertar(model);
        public Task<Localidad?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Localidad>> ObtenerTodos() => _repo.ObtenerTodos();
        public Task<IQueryable<Localidad>> ObtenerPorProvincia(int idProvincia) => _repo.ObtenerPorProvincia(idProvincia);
        public Task<IQueryable<Localidad>> ObtenerPorPartido(int idPartido) => _repo.ObtenerPorPartido(idPartido);

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "la localidad",
                "Localidad eliminada correctamente",
                id,
                () => _deleteChecker.CatalogoAsync<Localidad>(id));
    }
}
