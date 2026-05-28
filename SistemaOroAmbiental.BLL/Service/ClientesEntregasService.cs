using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesEntregasService : IClientesEntregasService
    {
        private readonly IClientesEntregasRepository _repo;

        public ClientesEntregasService(IClientesEntregasRepository repo)
        {
            _repo = repo;
        }

        public Task<List<ClientesEntrega>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCliente,
            int? idContrato,
            int? idEstado,
            string? texto)
            => _repo.ListarFiltrado(fechaDesde, fechaHasta, idCliente, idContrato, idEstado, texto);

        public Task<ClientesEntrega?> Obtener(int id) => _repo.Obtener(id);

        public Task<Dictionary<int, decimal>> SumarCobrosPorEntregas(IEnumerable<int> idsEntrega)
            => _repo.SumarCobrosPorEntregas(idsEntrega?.ToList() ?? new List<int>());

        public async Task<ServiceResult> Insertar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            cobros ??= new List<EntregaCobroRegistrar>();

            if (!Validar(entrega, lineas, out var error))
                return ServiceResult.Error(error, "validacion");

            if (!ValidarCobros(lineas, cobros, out error))
                return ServiceResult.Error(error, "validacion");

            int id;
            try
            {
                id = await _repo.Insertar(entrega, lineas, cobros, idUsuario);
            }
            catch (Exception ex)
            {
                var det = ex.InnerException?.Message ?? ex.Message;
                return ServiceResult.Error(
                    $"No se pudo registrar la entrega. {det}",
                    "error");
            }

            if (id > 0)
            {
                entrega.Id = id;
                var msg = cobros.Count > 0
                    ? $"Entrega #{id} y {cobros.Count} cobro(s) registrados correctamente."
                    : "Entrega registrada correctamente";

                return new ServiceResult
                {
                    Ok = true,
                    Mensaje = msg,
                    Tipo = "success",
                    IdReferencia = id
                };
            }

            return ServiceResult.Error(
                "No se pudo registrar la entrega. Se revirtieron todos los cambios (stock, cuenta corriente y cobros).");
        }

        public async Task<ServiceResult> Actualizar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            if (entrega.Id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            cobros ??= new List<EntregaCobroRegistrar>();

            if (!Validar(entrega, lineas, out var error))
                return ServiceResult.Error(error, "validacion");

            if (!ValidarCobros(lineas, cobros, out error))
                return ServiceResult.Error(error, "validacion");

            try
            {
                var ok = await _repo.Actualizar(entrega, lineas, cobros, idUsuario);

                var msg = cobros.Count > 0
                    ? "Entrega y cobros guardados correctamente."
                    : "Entrega modificada correctamente";

                return ok
                    ? ServiceResult.Success(msg)
                    : ServiceResult.Error(
                        "No se pudo modificar la entrega. Se revirtieron todos los cambios (stock, cuenta corriente y cobros).");
            }
            catch (InvalidOperationException ex)
            {
                var det = ex.InnerException?.Message ?? ex.Message;
                return ServiceResult.Error(det, "error");
            }
            catch (DbUpdateException ex)
            {
                var detalle = ex.InnerException?.Message;
                var msg = string.IsNullOrWhiteSpace(detalle)
                    ? "No se pudo modificar la entrega."
                    : $"No se pudo modificar la entrega: {detalle}";
                return ServiceResult.Error(msg, "error");
            }
        }

        public Task<ServiceResult> Eliminar(int id)
        {
            if (id <= 0)
                return Task.FromResult(ServiceResult.Error("Registro inválido.", "validacion"));

            return DeleteOperationHelper.ExecuteAsync(
                () => _repo.Eliminar(id),
                "la entrega",
                "Entrega eliminada. Se revirtieron stock, deuda en cuenta corriente, cobros y movimientos de caja.",
                id);
        }

        private static bool Validar(ClientesEntrega entrega, List<ClientesEntregasProducto>? lineas, out string error)
        {
            error = "";

            if (entrega.Fecha == default)
            {
                error = "Indique la fecha de la entrega.";
                return false;
            }

            if (entrega.IdCliente <= 0)
            {
                error = "Seleccione un cliente.";
                return false;
            }

            lineas ??= new List<ClientesEntregasProducto>();

            if (lineas.Count == 0)
            {
                error = "Agregue al menos un producto a la entrega.";
                return false;
            }

            var productos = new HashSet<string>();

            foreach (var l in lineas)
            {
                if (l.IdProducto <= 0)
                {
                    error = "Hay líneas sin producto seleccionado.";
                    return false;
                }

                var keyProducto = $"{l.IdProducto}_{(l.TipoMovimiento is 2 ? 2 : 1)}";
                if (!productos.Add(keyProducto))
                {
                    error = "No puede repetir el mismo producto con el mismo tipo en la entrega.";
                    return false;
                }

                if (l.TipoMovimiento is not 1 and not 2)
                {
                    error = "Tipo de movimiento inválido en una línea de producto.";
                    return false;
                }

                if (l.Cantidad <= 0)
                {
                    error = "Las cantidades deben ser mayores a cero.";
                    return false;
                }

                if (l.PrecioVenta < 0)
                {
                    error = "El precio de venta no puede ser negativo.";
                    return false;
                }
            }

            return true;
        }

        private static bool ValidarCobros(
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            out string error)
        {
            error = "";

            if (cobros.Count == 0)
                return true;

            foreach (var l in lineas)
                ClientesEntregasRepository.RecalcularLinea(l);

            var entregaCalc = new ClientesEntrega();
            ClientesEntregasRepository.RecalcularTotalesEntrega(entregaCalc, lineas);
            var totalEntrega = entregaCalc.ImporteTotal;

            decimal sumaCobros = 0;

            foreach (var c in cobros)
            {
                if (c.IdCuenta <= 0)
                {
                    error = "Cada cobro debe tener una cuenta de caja.";
                    return false;
                }

                if (c.Importe <= 0)
                {
                    error = "Los importes de cobro deben ser mayores a cero.";
                    return false;
                }

                if (string.IsNullOrWhiteSpace(c.Concepto))
                {
                    error = "Cada cobro debe tener un concepto.";
                    return false;
                }

                sumaCobros += c.Importe;
            }

            if (sumaCobros > totalEntrega + 0.01m)
            {
                error = "La suma de los cobros no puede superar el total de la entrega.";
                return false;
            }

            return true;
        }

        public async Task<EntregaCobrosResumen?> ObtenerCobros(int idEntrega)
        {
            if (idEntrega <= 0)
                return null;

            var entrega = await _repo.Obtener(idEntrega);
            if (entrega == null)
                return null;

            var (_, cobros, movimientosCc) = await _repo.ObtenerCobrosEntrega(idEntrega);
            var importeTotal = entrega.ImporteTotal;

            var items = cobros.Select(c => new EntregaCobroItem
            {
                IdCobro = c.Id,
                IdMovimientoCc = movimientosCc.TryGetValue(c.Id, out var idMov) ? idMov : 0,
                IdCuenta = c.IdCuenta,
                IdSucursal = c.IdCuentaNavigation?.IdSucursal ?? 0,
                Fecha = c.Fecha,
                Concepto = c.Concepto,
                Importe = c.Importe,
                Cuenta = c.IdCuentaNavigation?.Nombre ?? "",
                Sucursal = c.IdCuentaNavigation?.IdSucursalNavigation?.Nombre ?? "",
                Usuario = c.IdUsuarioRegistraNavigation?.Usuario
            }).ToList();

            var totalCobrado = items.Sum(x => x.Importe);

            return new EntregaCobrosResumen
            {
                IdEntrega = idEntrega,
                ImporteTotal = importeTotal,
                TotalCobrado = totalCobrado,
                SaldoPendiente = importeTotal - totalCobrado,
                TieneCobros = items.Count > 0,
                Cobros = items
            };
        }
    }
}
