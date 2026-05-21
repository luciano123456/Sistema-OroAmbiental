using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosCategoriasService : IProductosCategoriasService
    {
        private readonly IProductosCategoriasRepository _repo;

        public ProductosCategoriasService(IProductosCategoriasRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(ProductosCategoria model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(ProductosCategoria model) => _repo.Insertar(model);
        public Task<ProductosCategoria?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<ProductosCategoria>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
