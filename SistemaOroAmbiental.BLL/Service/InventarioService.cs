using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class InventarioService : IInventarioService
    {
        private readonly IInventarioRepository _repo;

        public InventarioService(IInventarioRepository repo)
        {
            _repo = repo;
        }

        public Task<List<(Producto producto, Inventario? inventario)>> ListarProductos(
            int idSucursal,
            string? buscar,
            bool soloBajoMinimo,
            int? idCategoria)
            => _repo.ListarProductos(idSucursal, buscar, soloBajoMinimo, idCategoria);

        public Task<List<InventarioMovimiento>> Movimientos(
            int idSucursal,
            int idProducto,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
            => _repo.Movimientos(idSucursal, idProducto, fechaDesde, fechaHasta, tipoMovimiento, texto);

        public Task<decimal> StockAnterior(int idSucursal, int idProducto, DateTime? fechaDesde)
            => _repo.StockAnterior(idSucursal, idProducto, fechaDesde);

        public Task<(decimal entradas, decimal salidas, int cantidad)> Resumen(
            int idSucursal,
            int idProducto,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
            => _repo.Resumen(idSucursal, idProducto, fechaDesde, fechaHasta, tipoMovimiento, texto);

        public async Task<decimal> StockActual(int idSucursal, int idProducto)
        {
            var inv = await _repo.ObtenerOCrearInventario(idSucursal, idProducto);
            return inv.Stock;
        }

        public Task<(InventarioMovimiento? mov, decimal stock)> ObtenerMovimiento(int id)
            => _repo.ObtenerMovimiento(id);

        public Task<(InventarioMovimiento? salida, InventarioMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo)
            => _repo.ObtenerParTransferencia(idMovimientoGrupo);

        public async Task<ServiceResult> RegistrarEntradaManual(
            int idSucursal,
            int idProducto,
            DateTime fecha,
            string concepto,
            decimal cantidad,
            int idUsuario)
        {
            if (idSucursal <= 0 || idProducto <= 0)
                return ServiceResult.Error("Sucursal y producto son obligatorios.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (cantidad <= 0)
                return ServiceResult.Error("La cantidad debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarEntradaManual(idSucursal, idProducto, fecha, concepto.Trim(), cantidad, idUsuario);

            return ok
                ? ServiceResult.Success("Entrada registrada correctamente.")
                : ServiceResult.Error("No se pudo registrar la entrada.");
        }

        public async Task<ServiceResult> RegistrarSalidaManual(
            int idSucursal,
            int idProducto,
            DateTime fecha,
            string concepto,
            decimal cantidad,
            int idUsuario)
        {
            if (idSucursal <= 0 || idProducto <= 0)
                return ServiceResult.Error("Sucursal y producto son obligatorios.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (cantidad <= 0)
                return ServiceResult.Error("La cantidad debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarSalidaManual(idSucursal, idProducto, fecha, concepto.Trim(), cantidad, idUsuario);

            return ok
                ? ServiceResult.Success("Salida registrada correctamente.")
                : ServiceResult.Error("No se pudo registrar la salida. Verifique stock disponible.");
        }

        public async Task<ServiceResult> RegistrarAjuste(
            int idSucursal,
            int idProducto,
            DateTime fecha,
            string concepto,
            decimal entrada,
            decimal salida,
            int idUsuario)
        {
            if (idSucursal <= 0 || idProducto <= 0)
                return ServiceResult.Error("Sucursal y producto son obligatorios.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (entrada <= 0 && salida <= 0)
                return ServiceResult.Error("Ingrese cantidad en Entrada o en Salida.", "validacion");

            if (entrada > 0 && salida > 0)
                return ServiceResult.Error("Solo puede ajustar Entrada o Salida, no ambos.", "validacion");

            var ok = await _repo.RegistrarAjuste(idSucursal, idProducto, fecha, concepto.Trim(), entrada, salida, idUsuario);

            return ok
                ? ServiceResult.Success("Ajuste registrado correctamente.")
                : ServiceResult.Error("No se pudo registrar el ajuste. Verifique stock disponible.");
        }

        public async Task<ServiceResult> RegistrarTransferencia(
            DateTime fecha,
            int idSucursalOrigen,
            int idProducto,
            int idSucursalDestino,
            decimal cantidad,
            string notaInterna,
            int idUsuario)
        {
            if (idSucursalOrigen <= 0 || idSucursalDestino <= 0 || idProducto <= 0)
                return ServiceResult.Error("Complete sucursales y producto.", "validacion");

            if (idSucursalOrigen == idSucursalDestino)
                return ServiceResult.Error("La sucursal origen y destino deben ser distintas.", "validacion");

            if (cantidad <= 0)
                return ServiceResult.Error("La cantidad debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarTransferencia(
                fecha, idSucursalOrigen, idProducto, idSucursalDestino, cantidad, notaInterna?.Trim() ?? "", idUsuario);

            return ok
                ? ServiceResult.Success("Transferencia registrada correctamente.")
                : ServiceResult.Error("No se pudo transferir. Verifique stock en sucursal origen.");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            var ok = await _repo.Eliminar(id);

            return ok
                ? ServiceResult.Success("Movimiento eliminado correctamente.")
                : ServiceResult.Error("No se pudo eliminar. Solo movimientos manuales o transferencias.");
        }
    }
}
