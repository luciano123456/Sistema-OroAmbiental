using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ComprasService : IComprasService
    {
        private readonly IComprasRepository _repo;
        private readonly IProveedoresCuentaCorrienteService _ccService;

        public ComprasService(
            IComprasRepository repo,
            IProveedoresCuentaCorrienteService ccService)
        {
            _repo = repo;
            _ccService = ccService;
        }

        public Task<List<Compra>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idProveedor,
            int? idSucursal,
            string? texto)
            => _repo.ListarFiltrado(fechaDesde, fechaHasta, idProveedor, idSucursal, texto);

        public Task<Compra?> Obtener(int id) => _repo.Obtener(id);

        public Task<bool> TienePagos(int idCompra) => _repo.TienePagos(idCompra);

        public Task<Dictionary<int, decimal>> SumarPagosPorCompras(IEnumerable<int> idsCompra)
            => _repo.SumarPagosPorCompras(idsCompra?.ToList() ?? new List<int>());

        public async Task<ServiceResult> Insertar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario)
        {
            pagos ??= new List<CompraPagoRegistrar>();

            if (!Validar(compra, lineas, out var error))
                return ServiceResult.Error(error, "validacion");

            if (!ValidarPagos(compra, lineas, pagos, out error))
                return ServiceResult.Error(error, "validacion");

            var id = await _repo.Insertar(compra, lineas, pagos, idUsuario);

            if (id > 0)
            {
                compra.Id = id;
                var msg = pagos.Count > 0
                    ? $"Compra #{id} y {pagos.Count} pago(s) registrados correctamente."
                    : "Compra registrada correctamente";

                return new ServiceResult
                {
                    Ok = true,
                    Mensaje = msg,
                    Tipo = "success",
                    IdReferencia = id
                };
            }

            return ServiceResult.Error(
                "No se pudo registrar la compra. Se revirtieron todos los cambios (stock, cuenta corriente y pagos).");
        }

        public async Task<ServiceResult> Actualizar(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            int idUsuario)
        {
            if (compra.Id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            pagos ??= new List<CompraPagoRegistrar>();

            if (!Validar(compra, lineas, out var error))
                return ServiceResult.Error(error, "validacion");

            if (!ValidarPagos(compra, lineas, pagos, out error))
                return ServiceResult.Error(error, "validacion");

            try
            {
                var ok = await _repo.Actualizar(compra, lineas, pagos, idUsuario);

                var msg = pagos.Count > 0
                    ? "Compra y pagos guardados correctamente."
                    : "Compra modificada correctamente";

                return ok
                    ? ServiceResult.Success(msg)
                    : ServiceResult.Error(
                        "No se pudo modificar la compra. Se revirtieron todos los cambios (stock, cuenta corriente y pagos).");
            }
            catch (DbUpdateException ex)
            {
                var detalle = ex.InnerException?.Message;
                var msg = string.IsNullOrWhiteSpace(detalle)
                    ? "No se pudo modificar la compra."
                    : $"No se pudo modificar la compra: {detalle}";
                return ServiceResult.Error(msg, "error");
            }
        }

        public Task<ServiceResult> Eliminar(int id)
        {
            if (id <= 0)
                return Task.FromResult(ServiceResult.Error("Registro inválido.", "validacion"));

            return DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "la compra",
                "Compra eliminada. Se revirtieron stock, deuda en cuenta corriente, pagos y movimientos de caja.",
                id);
        }

        private static bool Validar(Compra compra, List<ComprasProducto>? lineas, out string error)
        {
            error = "";

            if (compra.Fecha == default)
            {
                error = "Indique la fecha de la compra.";
                return false;
            }

            if (compra.IdProveedor <= 0)
            {
                error = "Seleccione un proveedor.";
                return false;
            }

            if (compra.IdSucursal <= 0)
            {
                error = "Seleccione una sucursal.";
                return false;
            }

            lineas ??= new List<ComprasProducto>();

            if (lineas.Count == 0)
            {
                error = "Agregue al menos un producto a la compra.";
                return false;
            }

            foreach (var l in lineas)
            {
                if (l.IdProducto <= 0)
                {
                    error = "Hay líneas sin producto seleccionado.";
                    return false;
                }

                if (l.Cantidad <= 0)
                {
                    error = "Las cantidades deben ser mayores a cero.";
                    return false;
                }

                if (l.CostoUnitario < 0)
                {
                    error = "El costo unitario no puede ser negativo.";
                    return false;
                }
            }

            return true;
        }

        private static bool ValidarPagos(
            Compra compra,
            List<ComprasProducto> lineas,
            List<CompraPagoRegistrar> pagos,
            out string error)
        {
            error = "";

            if (pagos.Count == 0)
                return true;

            lineas ??= new List<ComprasProducto>();
            foreach (var l in lineas)
                ComprasRepository.RecalcularLinea(l);

            var compraCalc = new Compra();
            ComprasRepository.RecalcularTotalesCompra(compraCalc, lineas);
            var totalCompra = compraCalc.ImporteTotal;

            decimal sumaPagos = 0;

            foreach (var p in pagos)
            {
                if (p.IdCuenta <= 0)
                {
                    error = "Cada pago debe tener una cuenta de caja.";
                    return false;
                }

                if (p.Importe <= 0)
                {
                    error = "Los importes de pago deben ser mayores a cero.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(p.Concepto))
                {
                    error = "Cada pago debe tener un concepto.";
                    return false;
                }

                sumaPagos += p.Importe;
            }

            if (sumaPagos > totalCompra + 0.01m)
            {
                error = "La suma de los pagos no puede superar el total de la compra.";
                return false;
            }

            return true;
        }

        public async Task<CompraPagosResumen?> ObtenerPagos(int idCompra)
        {
            if (idCompra <= 0)
                return null;

            var compra = await _repo.Obtener(idCompra);
            if (compra == null)
                return null;

            var (_, pagos, movimientosCc) = await _repo.ObtenerPagosCompra(idCompra);
            var importeTotal = compra.ImporteTotal;

            var items = pagos.Select(p => new CompraPagoItem
            {
                IdPago = p.Id,
                IdMovimientoCc = movimientosCc.TryGetValue(p.Id, out var idMov) ? idMov : 0,
                IdCuenta = p.IdCuenta,
                IdSucursal = p.IdCuentaNavigation?.IdSucursal ?? 0,
                Fecha = p.Fecha,
                Concepto = p.Concepto,
                Importe = p.Importe,
                Cuenta = p.IdCuentaNavigation?.Nombre ?? "",
                Sucursal = p.IdCuentaNavigation?.IdSucursalNavigation?.Nombre ?? "",
                Usuario = p.IdUsuarioRegistraNavigation?.Usuario
            }).ToList();

            var totalPagado = items.Sum(x => x.Importe);

            return new CompraPagosResumen
            {
                IdCompra = idCompra,
                ImporteTotal = importeTotal,
                TotalPagado = totalPagado,
                SaldoPendiente = importeTotal - totalPagado,
                TienePagos = items.Count > 0,
                Pagos = items
            };
        }

        public async Task<ServiceResult> RegistrarPago(
            int idCompra,
            int idCuenta,
            DateTime fecha,
            string concepto,
            decimal importe,
            int idUsuario)
        {
            if (idCompra <= 0)
                return ServiceResult.Error("Guarde la compra antes de registrar pagos.", "validacion");

            var compra = await _repo.Obtener(idCompra);
            if (compra == null)
                return ServiceResult.Error("No se encontró la compra.", "validacion");

            if (string.IsNullOrWhiteSpace(concepto))
                concepto = $"Pago compra #{idCompra}";

            return await _ccService.RegistrarPago(
                compra.IdProveedor,
                idCuenta,
                fecha == default ? DateTime.Now : fecha,
                concepto.Trim(),
                importe,
                idUsuario,
                idCompra);
        }

        public async Task<ServiceResult> EliminarPago(int idMovimientoCc, int idCompra)
        {
            if (idMovimientoCc <= 0)
                return ServiceResult.Error("Movimiento inválido.", "validacion");

            var resumen = await ObtenerPagos(idCompra);
            if (resumen == null)
                return ServiceResult.Error("No se encontró la compra.", "validacion");

            if (!resumen.Pagos.Any(p => p.IdMovimientoCc == idMovimientoCc))
                return ServiceResult.Error("El pago no pertenece a esta compra.", "validacion");

            return await _ccService.Eliminar(idMovimientoCc);
        }
    }
}
