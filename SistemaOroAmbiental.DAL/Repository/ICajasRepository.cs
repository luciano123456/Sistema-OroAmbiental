using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ICajasRepository
    {
        Task<List<CajasMovimiento>> Movimientos(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto);

        Task<decimal> SaldoAnterior(
            DateTime? fechaDesde,
            int? idCuenta,
            int? idSucursal);

        Task<(decimal ingresos, decimal egresos, int cantidad)> Resumen(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto);

        Task<(CajasMovimiento? mov, decimal saldo, string origen, bool puedeEditar, bool puedeEliminar, string? tipoTransferencia)> ObtenerMovimiento(int id);

        Task<(CajasMovimiento? salida, CajasMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo);

        Task<bool> RegistrarIngresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario);

        Task<bool> RegistrarEgresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario);

        Task<bool> ActualizarMovimientoManual(int id, DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario);

        Task<bool> RegistrarTransferencia(DateTime fecha, int idCuentaOrigen, int idCuentaDestino, decimal importe, string notaInterna, int idUsuario);

        Task<bool> ActualizarTransferencia(int idMovimientoGrupo, DateTime fecha, int idCuentaOrigen, int idCuentaDestino, decimal importe, string notaInterna, int idUsuario);

        Task<bool> Eliminar(int id, int idUsuario);
    }
}
