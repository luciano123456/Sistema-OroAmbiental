using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProductosRecuperadosService
    {
        Task<List<ProductoRecuperadoHistorialDto>> ListarHistorial(ProductosRecuperadosFiltroDto filtro);
        Task<ProductosRecuperadosDashboardDto> ObtenerDashboard(ProductosRecuperadosFiltroDto filtro);
        Task<List<ProductoRecuperadoStockDto>> ListarStockRecuperado(int? idSucursal, string? buscar);
        Task<ServiceResult> RegistrarManual(
            int idSucursal,
            int idProducto,
            decimal cantidad,
            DateTime fecha,
            string? concepto,
            int idUsuario);

        Task<ServiceResult> EliminarMovimientoManual(int idMovimiento);
    }
}
