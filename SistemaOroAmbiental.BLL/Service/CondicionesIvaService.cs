using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class CondicionesIvaService : ICondicionesIvaService
    {
        private readonly ICondicionesIvaRepository _repo;

        public CondicionesIvaService(ICondicionesIvaRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(CondicionesIva model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(CondicionesIva model) => _repo.Insertar(model);
        public Task<CondicionesIva?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<CondicionesIva>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
