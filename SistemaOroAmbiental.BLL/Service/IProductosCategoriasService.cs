using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosCategoriasService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosCategoria model);
        Task<bool> Insertar(ProductosCategoria model);
        Task<ProductosCategoria?> Obtener(int id);
        Task<IQueryable<ProductosCategoria>> ObtenerTodos();
    }
}
