using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProductosRecuperadosRepository
    {
        Task<List<ProductoRecuperadoHistorialDto>> ListarHistorial(ProductosRecuperadosFiltroDto filtro);
        Task<ProductosRecuperadosDashboardDto> ObtenerDashboard(ProductosRecuperadosFiltroDto filtro);
        Task<List<ProductoRecuperadoStockDto>> ListarStockRecuperado(int? idSucursal, string? buscar);
        Task RegistrarManual(
            int idSucursal,
            int idProducto,
            decimal cantidad,
            DateTime fecha,
            string concepto,
            int idUsuario);

        Task EliminarMovimientoManual(int idMovimiento);
    }
}
