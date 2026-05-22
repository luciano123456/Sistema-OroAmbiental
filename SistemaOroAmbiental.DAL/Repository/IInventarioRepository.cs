using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IInventarioRepository
    {
        Task<List<(Producto producto, Inventario? inventario)>> ListarProductos(
            int idSucursal,
            string? buscar,
            bool soloBajoMinimo,
            int? idCategoria);

        Task<Inventario> ObtenerOCrearInventario(int idSucursal, int idProducto);

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

        Task<(InventarioMovimiento? mov, decimal stock)> ObtenerMovimiento(int id);

        Task<(InventarioMovimiento? salida, InventarioMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo);

        Task<bool> RegistrarEntradaManual(int idSucursal, int idProducto, DateTime fecha, string concepto, decimal cantidad, int idUsuario);

        Task<bool> RegistrarSalidaManual(int idSucursal, int idProducto, DateTime fecha, string concepto, decimal cantidad, int idUsuario);

        Task<bool> RegistrarAjuste(int idSucursal, int idProducto, DateTime fecha, string concepto, decimal entrada, decimal salida, int idUsuario);

        Task<bool> RegistrarTransferencia(
            DateTime fecha,
            int idSucursalOrigen,
            int idProducto,
            int idSucursalDestino,
            decimal cantidad,
            string notaInterna,
            int idUsuario);

        Task<bool> Eliminar(int idMovimiento);
    }
}
