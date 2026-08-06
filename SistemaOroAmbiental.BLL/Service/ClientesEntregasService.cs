using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;
using System.Globalization;

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
            List<ClientesEntregasProductosRecuperado> lineasRecuperadas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            cobros ??= new List<EntregaCobroRegistrar>();

            if (!Validar(entrega, lineas, lineasRecuperadas, out var error))
                return ServiceResult.Error(error, "validacion");

            if (!ValidarCobros(lineas, cobros, out error))
                return ServiceResult.Error(error, "validacion");

            int id;
            try
            {
                id = await _repo.Insertar(entrega, lineas, lineasRecuperadas, cobros, idUsuario);
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
            List<ClientesEntregasProductosRecuperado> lineasRecuperadas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario)
        {
            if (entrega.Id <= 0)
                return ServiceResult.Error("Registro inválido.", "validacion");

            cobros ??= new List<EntregaCobroRegistrar>();

            if (!Validar(entrega, lineas, lineasRecuperadas, out var error))
                return ServiceResult.Error(error, "validacion");

            if (!ValidarCobros(lineas, cobros, out error))
                return ServiceResult.Error(error, "validacion");

            try
            {
                var ok = await _repo.Actualizar(entrega, lineas, lineasRecuperadas, cobros, idUsuario);

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

        private static string FormatoDecimal(decimal valor)
            => valor.ToString("0.####", CultureInfo.InvariantCulture);

        /// <summary>
        /// Huella de línea entrega/retiro: solo se rechaza si todos los campos editables coinciden.
        /// </summary>
        private static string ClaveLineaOperacion(ClientesEntregasProducto l, int tipo)
        {
            var idLista = l.IdListaPrecio is > 0 ? l.IdListaPrecio.Value : 0;
            return string.Join("|",
                l.IdProducto,
                tipo,
                idLista,
                FormatoDecimal(l.Cantidad),
                FormatoDecimal(l.PrecioVenta),
                FormatoDecimal(l.PorcDescuento),
                FormatoDecimal(l.PorcIva));
        }

        private static string ClaveLineaRecuperada(ClientesEntregasProductosRecuperado l)
        {
            var idLista = l.IdListaPrecio is > 0 ? l.IdListaPrecio.Value : 0;
            return string.Join("|",
                l.IdProducto,
                idLista,
                FormatoDecimal(l.Cantidad),
                FormatoDecimal(l.PrecioVenta),
                FormatoDecimal(l.PorcDescuento),
                FormatoDecimal(l.PorcIva));
        }

        private static bool Validar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto>? lineas,
            List<ClientesEntregasProductosRecuperado>? lineasRecuperadas,
            out string error)
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

            if (entrega.IdEstablecimiento <= 0)
            {
                error = "Seleccione el establecimiento de la entrega.";
                return false;
            }

            lineas ??= new List<ClientesEntregasProducto>();
            lineasRecuperadas ??= new List<ClientesEntregasProductosRecuperado>();

            if (lineas.Count == 0 && lineasRecuperadas.Count == 0)
            {
                error = "Agregue al menos un producto entregado/retirado o recuperado.";
                return false;
            }

            var productosOperacion = new HashSet<string>();

            foreach (var l in lineas)
            {
                if (l.IdProducto <= 0)
                {
                    error = "Hay líneas sin producto seleccionado.";
                    return false;
                }

                var tipo = l.TipoMovimiento;
                if (tipo is not ClientesEntregasRepository.TIPO_LINEA_ENTREGA
                    and not ClientesEntregasRepository.TIPO_LINEA_RETIRO)
                {
                    error = "Tipo de movimiento inválido en productos (solo entrega o retiro).";
                    return false;
                }

                // Solo se rechaza si la línea es idéntica en todos los campos (producto, tipo, lista, cantidad, precio, descuento, IVA).
                var keyProducto = ClaveLineaOperacion(l, tipo);
                if (!productosOperacion.Add(keyProducto))
                {
                    error = "No podés repetir una línea 100% igual (producto, tipo, lista, cantidad, precio, desc. e IVA). Si cambia algún dato, sí se permite.";
                    return false;
                }

                if (l.Cantidad <= 0)
                {
                    error = "Las cantidades deben ser mayores a cero.";
                    return false;
                }

                // Lista / tipo de pago: obligatorio solo en retiros.
                if (tipo == ClientesEntregasRepository.TIPO_LINEA_RETIRO
                    && l.IdListaPrecio is null or <= 0)
                {
                    error = "Seleccioná la lista / tipo de pago en las líneas de retiro.";
                    return false;
                }

                if (l.PrecioVenta < 0)
                {
                    error = "El precio de venta no puede ser negativo.";
                    return false;
                }
            }

            var productosRecuperados = new HashSet<string>();

            foreach (var l in lineasRecuperadas)
            {
                if (l.IdProducto <= 0)
                {
                    error = "Hay líneas recuperadas sin producto seleccionado.";
                    return false;
                }

                var keyRecuperado = ClaveLineaRecuperada(l);
                if (!productosRecuperados.Add(keyRecuperado))
                {
                    error = "No podés repetir una línea recuperada 100% igual. Si cambia algún dato, sí se permite.";
                    return false;
                }

                if (l.Cantidad <= 0)
                {
                    error = "Las cantidades recuperadas deben ser mayores a cero.";
                    return false;
                }

                if (l.PrecioVenta < 0)
                {
                    error = "El precio de referencia no puede ser negativo.";
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

            // Los cobros se imputan a lo retirado (lo que el cliente paga).
            var totalCobrar = lineas
                .Where(l => l.TipoMovimiento == ClientesEntregasRepository.TIPO_LINEA_RETIRO)
                .Sum(l => l.SubtotalFinal);

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

            if (sumaCobros > totalCobrar + 0.01m)
            {
                error = "La suma de los cobros no puede superar el total de lo retirado.";
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
