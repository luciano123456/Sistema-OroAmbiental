using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IInventarioService
    {
        Task<List<(Producto producto, Inventario? inventario)>> ListarProductos(
            int idSucursal,
            string? buscar,
            bool soloBajoMinimo,
            int? idCategoria);

        Task<List<InventarioMovimiento>> Movimientos(
            int idSucursal,
            int idProducto,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto);

        Task<decimal> StockAnterior(int idSucursal, int idProducto, DateTime? fechaDesde);

        Task<(decimal entradas, decimal salidas, int cantidad)> Resumen(
            int idSucursal,
            int idProducto,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto);

        Task<decimal> StockActual(int idSucursal, int idProducto);

        Task<(InventarioMovimiento? mov, decimal stock)> ObtenerMovimiento(int id);

        Task<(InventarioMovimiento? salida, InventarioMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo);

        Task<ServiceResult> RegistrarEntradaManual(
            int idSucursal, int idProducto, DateTime fecha, string concepto, decimal cantidad, int idUsuario);

        Task<ServiceResult> RegistrarSalidaManual(
            int idSucursal, int idProducto, DateTime fecha, string concepto, decimal cantidad, int idUsuario);

        Task<ServiceResult> RegistrarAjuste(
            int idSucursal, int idProducto, DateTime fecha, string concepto, decimal entrada, decimal salida, int idUsuario);

        Task<ServiceResult> RegistrarTransferencia(
            DateTime fecha,
            int idSucursalOrigen,
            int idProducto,
            int idSucursalDestino,
            decimal cantidad,
            string notaInterna,
            int idUsuario);

        Task<ServiceResult> Eliminar(int id);
    }
}
