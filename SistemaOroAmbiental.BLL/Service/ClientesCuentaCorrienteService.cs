using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesCuentaCorrienteService : IClientesCuentaCorrienteService
    {
        private readonly IClientesCuentaCorrienteRepository _repo;

        public ClientesCuentaCorrienteService(IClientesCuentaCorrienteRepository repo)
        {
            _repo = repo;
        }

        public Task<List<(Cliente cliente, decimal saldo)>> ListarClientes(string? buscar, bool soloSaldoActivo)
            => _repo.ListarClientes(buscar, soloSaldoActivo);

        public Task<List<ClientesCuentaCorrienteMovimiento>> Movimientos(
            int idCliente,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
            => _repo.Movimientos(idCliente, fechaDesde, fechaHasta, tipoMovimiento, texto);

        public Task<decimal> SaldoAnterior(int idCliente, DateTime? fechaDesde)
            => _repo.SaldoAnterior(idCliente, fechaDesde);

        public Task<(decimal debe, decimal haber, int cantidad)> Resumen(
            int idCliente,
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            string? tipoMovimiento,
            string? texto)
            => _repo.Resumen(idCliente, fechaDesde, fechaHasta, tipoMovimiento, texto);

        public Task<(ClientesCuentaCorrienteMovimiento? mov, string? cuenta, string? sucursal, decimal saldo)> ObtenerMovimiento(int id)
            => _repo.ObtenerMovimiento(id);

        public async Task<ServiceResult> RegistrarCobro(
            int idCliente,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario)
        {
            if (idCliente <= 0)
                return ServiceResult.Error("Debe seleccionar un cliente.", "validacion");

            if (idCuenta <= 0)
                return ServiceResult.Error("Debe seleccionar una cuenta de caja.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarCobro(
                idCliente,
                idCuenta,
                fecha,
                concepto.Trim(),
                importe,
                idUsuario);

            return ok
                ? ServiceResult.Success("Cobro registrado correctamente.")
                : ServiceResult.Error("No se pudo registrar el cobro.");
        }

        public async Task<ServiceResult> RegistrarAjuste(
            int idCliente,
            int? idCuenta,
            DateTime fecha,
            string concepto,
            decimal debe,
            decimal haber,
            int idUsuario)
        {
            if (idCliente <= 0)
                return ServiceResult.Error("Debe seleccionar un cliente.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (debe <= 0 && haber <= 0)
                return ServiceResult.Error("Debe ingresar un importe en Debe o en Haber.", "validacion");

            if ((debe > 0 || haber > 0) && (!idCuenta.HasValue || idCuenta <= 0))
                return ServiceResult.Error("Seleccione una cuenta de caja para el impacto en tesorería.", "validacion");

            var ok = await _repo.RegistrarAjuste(
                idCliente,
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

        public async Task<ServiceResult> RegistrarInteres(
            int idCliente,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario)
        {
            if (idCliente <= 0)
                return ServiceResult.Error("Debe seleccionar un cliente.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe de interés debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarInteres(
                idCliente,
                fecha,
                concepto.Trim(),
                importe,
                idUsuario);

            return ok
                ? ServiceResult.Success("Interés registrado correctamente.")
                : ServiceResult.Error("No se pudo registrar el interés.");
        }

        public async Task<ServiceResult> Eliminar(int id)
        {
            var ok = await _repo.Eliminar(id);

            return ok
                ? ServiceResult.Success("Movimiento eliminado correctamente.")
                : ServiceResult.Error("No se pudo eliminar el movimiento. Solo se pueden eliminar cobros, ajustes e intereses manuales.");
        }
    }
}
