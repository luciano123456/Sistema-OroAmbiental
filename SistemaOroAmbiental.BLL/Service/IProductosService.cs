using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosService
    {
        Task<ServiceResult> Insertar(Producto model);

        Task<ServiceResult> Actualizar(Producto model);

        Task<ServiceResult> Eliminar(int id);

        Task<Producto?> Obtener(int id);

        Task<IQueryable<Producto>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);

        Task<Dictionary<int, decimal>> ObtenerStockTotalesPorProducto();

        Task<(Producto? producto, List<ProductoHistorialCostoFila> historial)> ObtenerHistorialCosto(int idProducto);
    }
}
