using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class UnidadesMedidaService : IUnidadesMedidaService
    {
        private readonly IUnidadesMedidaRepository _repo;

        public UnidadesMedidaService(IUnidadesMedidaRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(UnidadesMedida model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(UnidadesMedida model) => _repo.Insertar(model);
        public Task<UnidadesMedida?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<UnidadesMedida>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
