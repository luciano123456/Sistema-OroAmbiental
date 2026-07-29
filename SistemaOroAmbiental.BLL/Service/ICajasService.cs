using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ICajasService
    {
        Task<List<CajasMovimiento>> Movimientos(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto,
            string? tipoCuenta = null);

        Task<decimal> SaldoAnterior(
            DateTime? fechaDesde,
            int? idCuenta,
            int? idSucursal,
            string? tipoCuenta = null);

        Task<(decimal ingresos, decimal egresos, int cantidad)> Resumen(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto,
            string? tipoCuenta = null);

        Task<(decimal saldoEfectivo, decimal saldoBanco, decimal ingresosEfectivo, decimal egresosEfectivo, decimal ingresosBanco, decimal egresosBanco)> ResumenConsolidado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idSucursal,
            string? texto);

        Task<(CajasMovimiento? mov, decimal saldo, string origen, bool puedeEditar, bool puedeEliminar, string? tipoTransferencia)> ObtenerMovimiento(int id);

        Task<(CajasMovimiento? salida, CajasMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo);

        Task<ServiceResult> RegistrarIngresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario);

        Task<ServiceResult> RegistrarEgresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario);

        Task<ServiceResult> ActualizarMovimientoManual(int id, DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario);

        Task<ServiceResult> RegistrarTransferencia(DateTime fecha, int idCuentaOrigen, int idCuentaDestino, decimal importe, string notaInterna, int idUsuario);

        Task<ServiceResult> ActualizarTransferencia(int idMovimientoGrupo, DateTime fecha, int idCuentaOrigen, int idCuentaDestino, decimal importe, string notaInterna, int idUsuario);

        Task<ServiceResult> Eliminar(int id, int idUsuario);
    }
}
