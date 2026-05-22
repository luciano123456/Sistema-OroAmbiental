using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class UsuariosEstadosService : IUsuariosEstadosService
    {
        private readonly IUsuariosEstadosRepository _repo;

        public UsuariosEstadosService(IUsuariosEstadosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(UsuariosEstado model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(UsuariosEstado model) => _repo.Insertar(model);
        public Task<UsuariosEstado?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<UsuariosEstado>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
