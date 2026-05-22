using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IComprasRepository
    {
        Task<List<Compra>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idProveedor,
            int? idSucursal,
            string? texto);

        Task<Compra?> Obtener(int id);

        Task<bool> TienePagos(int idCompra);

        Task<int> Insertar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario);

        Task<bool> Actualizar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario);

        Task<bool> Eliminar(int id);

        Task<(decimal importeTotal, List<ProveedoresPago> pagos, Dictionary<int, int> movimientosCcPorPago)> ObtenerPagosCompra(int idCompra);

        Task<Dictionary<int, decimal>> SumarPagosPorCompras(IReadOnlyList<int> idsCompra);
    }
}
