using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class EstadosUsuariosService : IEstadosUsuariosService
    {
        private readonly IEstadosUsuariosRepository _repo;

        public EstadosUsuariosService(IEstadosUsuariosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(EstadosUsuario model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(EstadosUsuario model) => _repo.Insertar(model);
        public Task<EstadosUsuario?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<EstadosUsuario>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
