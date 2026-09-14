using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProductosRepository
    {
        Task<bool> Insertar(Producto model);

        Task<bool> Actualizar(Producto model);

        Task<bool> Eliminar(int id);

        Task<Producto?> Obtener(int id);

        Task<IQueryable<Producto>> ObtenerTodos(bool soloActivos = false);

        Task<bool> CambiarActivo(int id, bool activo);

        Task<Dictionary<int, decimal>> ObtenerStockTotalesPorProducto();

        Task<Producto?> BuscarDuplicado(int? idExcluir, string? nombre);

        Task<Producto?> BuscarDescartadorHojaRuta(bool chico, bool grande, int? idExcluir);

        Task<List<ProductoHistorialCostoFila>> ObtenerHistorialCosto(int idProducto);
    }
}
