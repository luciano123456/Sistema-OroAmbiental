using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProductosPreciosRepository
    {
        Task<bool> Eliminar(int id);

        Task<bool> Actualizar(ProductosPrecio model);

        Task<bool> Insertar(ProductosPrecio model);

        Task<ProductosPrecio?> Obtener(int id);

        Task<IQueryable<ProductosPrecio>> ObtenerTodos();

        Task<List<ProductosPrecio>> ObtenerPorProducto(int idProducto);

        Task<List<ListasPrecio>> ObtenerListasPrecios();

        Task<bool> GuardarPorProducto(int idProducto, IEnumerable<ProductosPrecio> precios, int idUsuario);
    }
}
