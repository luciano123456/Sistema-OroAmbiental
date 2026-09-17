using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosService
    {
        Task<ServiceResult> Insertar(Producto model, bool reemplazarDescartadorHojaRuta = false);

        Task<ServiceResult> Actualizar(Producto model, bool reemplazarDescartadorHojaRuta = false);

        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);

        Task<Producto?> Obtener(int id);

        Task<IQueryable<Producto>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);

        Task<Dictionary<int, decimal>> ObtenerStockTotalesPorProducto();

        Task<(Producto? producto, List<ProductoHistorialCostoFila> historial)> ObtenerHistorialCosto(int idProducto);

        /// <summary>
        /// Devuelve error descartador_ocupado si el rol ya está tomado por otro producto.
        /// </summary>
        Task<ServiceResult?> VerificarDescartadorHojaRuta(bool esChico, bool esGrande, int? idExcluir);
    }
}
