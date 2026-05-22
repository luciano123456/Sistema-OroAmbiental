using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IComprasService
    {
        Task<List<Compra>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idProveedor,
            int? idSucursal,
            string? texto);

        Task<Compra?> Obtener(int id);

        Task<bool> TienePagos(int idCompra);

        Task<Dictionary<int, decimal>> SumarPagosPorCompras(IEnumerable<int> idsCompra);

        Task<ServiceResult> Insertar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario);

        Task<ServiceResult> Actualizar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario);

        Task<ServiceResult> Eliminar(int id);

        Task<CompraPagosResumen?> ObtenerPagos(int idCompra);

        Task<ServiceResult> RegistrarPago(int idCompra, int idCuenta, DateTime fecha, string concepto, decimal importe, int idUsuario);

        Task<ServiceResult> EliminarPago(int idMovimientoCc, int idCompra);
    }
}
