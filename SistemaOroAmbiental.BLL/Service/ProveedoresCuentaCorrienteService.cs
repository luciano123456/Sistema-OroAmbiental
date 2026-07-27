using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProveedoresCuentaCorrienteService : IProveedoresCuentaCorrienteService
    {
        private readonly IProveedoresCuentaCorrienteRepository _repo;

        public ProveedoresCuentaCorrienteService(IProveedoresCuentaCorrienteRepository repo)
        {
            _repo = repo;
        }

        public Task<List<(Proveedore proveedor, decimal saldo)>> ListarProveedores(string? buscar, bool soloSaldoActivo)
            => _repo.ListarProveedores(buscar, soloSaldoActivo);

        public Task<List<ProveedoresCuentaCorrienteMovimiento>> Movimientos(
            int idProveedor,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
            => _repo.Movimientos(idProveedor, fechaDesde, fechaHasta, tipoMovimiento, texto);

        public Task<decimal> SaldoAnterior(int idProveedor, DateTime? fechaDesde)
            => _repo.SaldoAnterior(idProveedor, fechaDesde);

        public Task<(decimal debe, decimal haber, int cantidad)> Resumen(
            int idProveedor,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
            => _repo.Resumen(idProveedor, fechaDesde, fechaHasta, tipoMovimiento, texto);

        public Task<(ProveedoresCuentaCorrienteMovimiento? mov, string? cuenta, string? sucursal, decimal saldo)> ObtenerMovimiento(int id)
            => _repo.ObtenerMovimiento(id);

        public async Task<ServiceResult> RegistrarPago(
            int idProveedor,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario,
            int? idCompra = null)
        {
            if (idProveedor <= 0)
                return ServiceResult.Error("Debe seleccionar un proveedor.", "validacion");

            if (idCuenta <= 0)
                return ServiceResult.Error("Debe seleccionar una cuenta de caja.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarPago(
                idProveedor,
                idCuenta,
                fecha,
                concepto.Trim(),
                importe,
                idUsuario,
                idCompra);

            return ok
                ? ServiceResult.Success("Pago registrado correctamente.")
                : ServiceResult.Error("No se pudo registrar el pago.");
        }

        public async Task<ServiceResult> RegistrarAjuste(
            int idProveedor,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario)
        {
            if (idProveedor <= 0)
                return ServiceResult.Error("Debe seleccionar un proveedor.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (debe <= 0 && haber <= 0)
                return ServiceResult.Error("Debe ingresar un importe en Debe o en Haber.", "validacion");

            if ((debe > 0 || haber > 0) && (!idCuenta.HasValue || idCuenta <= 0))
                return ServiceResult.Error("Seleccione una cuenta de caja para el impacto en tesorería.", "validacion");

            var ok = await _repo.RegistrarAjuste(
                idProveedor,
                idCuenta,
                fecha,
                concepto.Trim(),
                debe,
                haber,
                idUsuario);

            return ok
                ? ServiceResult.Success("Ajuste registrado correctamente.")
                : ServiceResult.Error("No se pudo registrar el ajuste.");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            var ok = await _repo.Eliminar(id);

            return ok
                ? ServiceResult.Success("Movimiento eliminado correctamente.")
                : ServiceResult.Error("No se pudo eliminar el movimiento. Solo se pueden eliminar pagos y ajustes manuales.");
        }
    }
}
