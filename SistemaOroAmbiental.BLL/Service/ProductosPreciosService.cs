using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosPreciosService : IProductosPreciosService
    {
        private readonly IProductosPreciosRepository _repo;

        public ProductosPreciosService(IProductosPreciosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(ProductosPrecio model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(ProductosPrecio model) => _repo.Insertar(model);
        public Task<ProductosPrecio?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<ProductosPrecio>> ObtenerTodos() => _repo.ObtenerTodos();
        public Task<int> ObtenerPrimeraListaPrecioId() => _repo.ObtenerPrimeraListaPrecioId();
    }
}
