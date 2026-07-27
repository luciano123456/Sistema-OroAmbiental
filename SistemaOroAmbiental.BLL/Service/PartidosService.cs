using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class PartidosService : IPartidosService
    {
        private readonly IPartidosRepository _repo;
        private readonly IDeleteConflictChecker _deleteChecker;

        public PartidosService(IPartidosRepository repo, IDeleteConflictChecker deleteChecker)
        {
            _repo = repo;
            _deleteChecker = deleteChecker;
        }

        public Task<bool> Actualizar(Partido model) => _repo.Actualizar(model);
        public Task<bool> Insertar(Partido model) => _repo.Insertar(model);
        public Task<Partido?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Partido>> ObtenerTodos() => _repo.ObtenerTodos();
        public Task<IQueryable<Partido>> ObtenerPorProvincia(int idProvincia) => _repo.ObtenerPorProvincia(idProvincia);

        public Task<ServiceResult> Eliminar(int id)
            => DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "el partido",
                "Partido eliminado correctamente",
                id,
                () => _deleteChecker.CatalogoAsync<Partido>(id));
    }
}
