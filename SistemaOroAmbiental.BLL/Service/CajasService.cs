using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class CajasService : ICajasService
    {
        private readonly ICajasRepository _repo;

        public CajasService(ICajasRepository repo)
        {
            _repo = repo;
        }

        public Task<List<CajasMovimiento>> Movimientos(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto)
            => _repo.Movimientos(fechaDesde, fechaHasta, idCuenta, idSucursal, tipoMovimiento, texto);

        public Task<decimal> SaldoAnterior(DateTime? fechaDesde, int? idCuenta, int? idSucursal)
            => _repo.SaldoAnterior(fechaDesde, idCuenta, idSucursal);

        public Task<(decimal ingresos, decimal egresos, int cantidad)> Resumen(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCuenta,
            int? idSucursal,
            string? tipoMovimiento,
            string? texto)
            => _repo.Resumen(fechaDesde, fechaHasta, idCuenta, idSucursal, tipoMovimiento, texto);

        public Task<(CajasMovimiento? mov, decimal saldo, string origen, bool puedeEditar, bool puedeEliminar, string? tipoTransferencia)> ObtenerMovimiento(int id)
            => _repo.ObtenerMovimiento(id);

        public Task<(CajasMovimiento? salida, CajasMovimiento? entrada)> ObtenerParTransferencia(int idMovimientoGrupo)
            => _repo.ObtenerParTransferencia(idMovimientoGrupo);

        public async Task<ServiceResult> RegistrarIngresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario)
        {
            if (idCuenta <= 0)
                return ServiceResult.Error("Debe seleccionar una cuenta.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarIngresoManual(fecha, idCuenta, concepto.Trim(), importe, idUsuario);

            return ok
                ? ServiceResult.Success("Ingreso registrado correctamente")
                : ServiceResult.Error("No se pudo registrar el ingreso");
        }

        public async Task<ServiceResult> RegistrarEgresoManual(DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario)
        {
            if (idCuenta <= 0)
                return ServiceResult.Error("Debe seleccionar una cuenta.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarEgresoManual(fecha, idCuenta, concepto.Trim(), importe, idUsuario);

            return ok
                ? ServiceResult.Success("Egreso registrado correctamente")
                : ServiceResult.Error("No se pudo registrar el egreso");
        }

        public async Task<ServiceResult> ActualizarMovimientoManual(int id, DateTime fecha, int idCuenta, string concepto, decimal importe, int idUsuario)
        {
            if (id <= 0)
                return ServiceResult.Error("Movimiento inválido.", "validacion");

            if (idCuenta <= 0)
                return ServiceResult.Error("Debe seleccionar una cuenta.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                return ServiceResult.Error("El concepto es obligatorio.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe debe ser mayor a cero.", "validacion");

            var ok = await _repo.ActualizarMovimientoManual(id, fecha, idCuenta, concepto.Trim(), importe, idUsuario);

            return ok
                ? ServiceResult.Success("Movimiento modificado correctamente")
                : ServiceResult.Error("No se pudo modificar el movimiento");
        }

        public async Task<ServiceResult> RegistrarTransferencia(
            DateTime fecha,
            int idCuentaOrigen,
            int idCuentaDestino,
            decimal importe,
            string notaInterna,
            int idUsuario)
        {
            if (idCuentaOrigen <= 0 || idCuentaDestino <= 0)
                return ServiceResult.Error("Debe seleccionar cuenta origen y destino.", "validacion");

            if (idCuentaOrigen == idCuentaDestino)
                return ServiceResult.Error("La cuenta origen y destino deben ser distintas.", "validacion");

            if (importe <= 0)
                return ServiceResult.Error("El importe debe ser mayor a cero.", "validacion");

            var ok = await _repo.RegistrarTransferencia(fecha, idCuentaOrigen, idCuentaDestino, importe, notaInterna?.Trim() ?? "", idUsuario);

            return ok
                ? ServiceResult.Success("Transferencia registrada correctamente")
                : ServiceResult.Error("No se pudo registrar la transferencia");
        }

        public async Task<ServiceResult> ActualizarTransferencia(
            int idMovimientoGrupo,
            DateTime fecha,
            int idCuentaOrigen,
            int idCuentaDestino,
            decimal importe,
            string notaInterna,
            int idUsuario)
        {
            if (idMovimientoGrupo <= 0)
                return ServiceResult.Error("Transferencia inválida.", "validacion");

            var ok = await _repo.ActualizarTransferencia(idMovimientoGrupo, fecha, idCuentaOrigen, idCuentaDestino, importe, notaInterna?.Trim() ?? "", idUsuario);

            return ok
                ? ServiceResult.Success("Transferencia modificada correctamente")
                : ServiceResult.Error("No se pudo modificar la transferencia");
        }

        public async Task<ServiceResult> Eliminar(int id, int idUsuario)
        {
            var ok = await _repo.Eliminar(id, idUsuario);

            return ok
                ? ServiceResult.Success("Movimiento eliminado correctamente")
                : ServiceResult.Error("No se pudo eliminar el movimiento. Puede estar vinculado a otro módulo.");
        }
    }
}
