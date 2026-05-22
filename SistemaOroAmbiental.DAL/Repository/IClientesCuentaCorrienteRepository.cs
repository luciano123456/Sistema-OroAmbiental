using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesCuentaCorrienteRepository
    {
        Task<List<(Cliente cliente, decimal saldo)>> ListarClientes(string? buscar, bool soloSaldoActivo);

        Task<ClientesCuentaCorriente> ObtenerOCrearCuentaCorriente(int idCliente);

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

        Task<bool> RegistrarCobro(
            int idCliente,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario);

        Task<bool> RegistrarAjuste(
            int idCliente,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario);

        Task<bool> Eliminar(int idMovimiento);
    }
}
