using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class RolService : IRolService
    {
        private readonly IRolRepository _repo;

        public RolService(IRolRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Rol model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Rol model) => _repo.Insertar(model);
        public Task<Rol?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Rol>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
