using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosPreciosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosPrecio model);
        Task<bool> Insertar(ProductosPrecio model);
        Task<ProductosPrecio?> Obtener(int id);
        Task<IQueryable<ProductosPrecio>> ObtenerTodos();
        Task<int> ObtenerPrimeraListaPrecioId();
    }
}
