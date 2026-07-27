using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProductosRecuperadosService : IProductosRecuperadosService
    {
        private readonly IProductosRecuperadosRepository _repo;

        public ProductosRecuperadosService(IProductosRecuperadosRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ProductoRecuperadoHistorialDto>> ListarHistorial(ProductosRecuperadosFiltroDto filtro)
            => _repo.ListarHistorial(filtro);

        public Task<ProductosRecuperadosDashboardDto> ObtenerDashboard(ProductosRecuperadosFiltroDto filtro)
            => _repo.ObtenerDashboard(filtro);

        public Task<List<ProductoRecuperadoStockDto>> ListarStockRecuperado(int? idSucursal, string? buscar)
            => _repo.ListarStockRecuperado(idSucursal, buscar);

        public async Task<ServiceResult> RegistrarManual(
            int idSucursal,
            int idProducto,
            decimal cantidad,
            DateTime fecha,
            string? concepto,
            int idUsuario)
        {
            if (idSucursal <= 0 || idProducto <= 0)
                return ServiceResult.Error("Seleccione sucursal y producto.", "validacion");

            if (cantidad <= 0)
                return ServiceResult.Error("La cantidad debe ser mayor a cero.", "validacion");

            try
            {
                await _repo.RegistrarManual(idSucursal, idProducto, cantidad, fecha, concepto ?? "", idUsuario);
                return ServiceResult.Success("Recuperación registrada correctamente.");
            }
            catch (Exception ex)
            {
                return ServiceResult.Error(ex.Message, "error");
            }
        }

        public async Task<ServiceResult> EliminarMovimientoManual(int idMovimiento)
        {
            if (idMovimiento <= 0)
                return ServiceResult.Error("Movimiento inválido.", "validacion");

            try
            {
                await _repo.EliminarMovimientoManual(idMovimiento);
                return ServiceResult.Success("Recuperación eliminada correctamente.");
            }
            catch (Exception ex)
            {
                return ServiceResult.Error(ex.Message, "error");
            }
        }
    }
}
