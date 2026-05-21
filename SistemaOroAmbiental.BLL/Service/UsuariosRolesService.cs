using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class UsuariosRolesService : IUsuariosRolesService
    {
        private readonly IUsuariosRolesRepository _repo;

        public UsuariosRolesService(IUsuariosRolesRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(UsuariosRol model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(UsuariosRol model) => _repo.Insertar(model);
        public Task<UsuariosRol?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<UsuariosRol>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
