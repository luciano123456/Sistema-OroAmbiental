using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProveedoresCuentaCorrienteRepository
    {
        Task<List<(Proveedore proveedor, decimal saldo)>> ListarProveedores(string? buscar, bool soloSaldoActivo);

        Task<ProveedoresCuentaCorriente> ObtenerOCrearCuentaCorriente(int idProveedor);

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

        Task<bool> RegistrarPago(
            int idProveedor,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idCompra = null);

        /// <summary>Registra pago sin abrir transacción (participa en la del llamador).</summary>
        Task<bool> RegistrarPagoSinTransaccion(
            int idProveedor,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idCompra = null);

        Task<bool> RegistrarAjuste(
            int idProveedor,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario);

        Task<bool> Eliminar(int idMovimiento);

        /// <summary>Elimina pago/ajuste sin abrir transacción (participa en la del llamador).</summary>
        Task<bool> EliminarSinTransaccion(int idMovimiento);
    }
}
