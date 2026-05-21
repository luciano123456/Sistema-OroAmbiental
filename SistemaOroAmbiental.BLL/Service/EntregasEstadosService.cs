using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class EntregasEstadosService : IEntregasEstadosService
    {
        private readonly IEntregasEstadosRepository _repo;

        public EntregasEstadosService(IEntregasEstadosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(EntregasEstado model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(EntregasEstado model) => _repo.Insertar(model);
        public Task<EntregasEstado?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<EntregasEstado>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
