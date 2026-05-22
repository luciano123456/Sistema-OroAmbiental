using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProveedoresCuentaCorrienteService
    {
        Task<List<(Proveedore proveedor, decimal saldo)>> ListarProveedores(string? buscar, bool soloSaldoActivo);

        Task<List<ProveedoresCuentaCorrienteMovimiento>> Movimientos(
            int idProveedor,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto);

        Task<decimal> SaldoAnterior(int idProveedor, DateTime? fechaDesde);

        Task<(decimal debe, decimal haber, int cantidad)> Resumen(
            int idProveedor,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto);

        Task<(ProveedoresCuentaCorrienteMovimiento? mov, string? cuenta, string? sucursal, decimal saldo)> ObtenerMovimiento(int id);

        Task<ServiceResult> RegistrarPago(
            int idProveedor,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idCompra = null);

        Task<ServiceResult> RegistrarAjuste(
            int idProveedor,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario);

        Task<ServiceResult> Eliminar(int id);
    }
}
