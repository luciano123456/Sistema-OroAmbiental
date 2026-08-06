using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesCuentaCorrienteService
    {
        Task<List<(Cliente cliente, decimal saldo)>> ListarClientes(string? buscar, bool soloSaldoActivo);

        Task<List<ClientesCuentaCorrienteMovimiento>> Movimientos(
            int idCliente,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto);

        Task<decimal> SaldoAnterior(int idCliente, DateTime? fechaDesde);

        Task<(decimal debe, decimal haber, int cantidad)> Resumen(
            int idCliente,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto);

        Task<(ClientesCuentaCorrienteMovimiento? mov, string? cuenta, string? sucursal, decimal saldo)> ObtenerMovimiento(int id);

        Task<ServiceResult> RegistrarCobro(
            int idCliente,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario);

        Task<ServiceResult> RegistrarAjuste(
            int idCliente,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario);

        Task<ServiceResult> RegistrarInteres(
            int idCliente,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario);

        Task<ServiceResult> Eliminar(int id);
    }
}
