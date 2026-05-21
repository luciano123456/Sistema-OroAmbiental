using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosService : IProductosService
    {
        private readonly IProductosRepository _repo;

        public ProductosService(IProductosRepository repo)
        {
            _repo = repo;
        }

        public Task<IQueryable<Producto>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
