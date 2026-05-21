using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProductosCategoriasRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosCategoria model);
        Task<bool> Insertar(ProductosCategoria model);
        Task<ProductosCategoria?> Obtener(int id);
        Task<IQueryable<ProductosCategoria>> ObtenerTodos();
    }
}
