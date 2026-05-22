using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesEntregasController : Controller
    {
        private readonly IClientesEntregasService _service;

        public ClientesEntregasController(IClientesEntregasService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [AllowAnonymous]
        public IActionResult NuevoModif(int id = 0, int idContrato = 0)
        {
            ViewBag.Id = id;
            ViewBag.IdContrato = idContrato;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ListaFiltrada([FromBody] VMClienteEntregaFiltro filtro)
        {
            var lista = await _service.ListarFiltrado(
                filtro?.FechaDesde,
                filtro?.FechaHasta,
                filtro?.IdCliente,
                filtro?.IdContrato,
                filtro?.IdEstado,
                filtro?.Texto);

            var ids = lista.Select(x => x.Id).ToList();
            var cobrosPorEntrega = await _service.SumarCobrosPorEntregas(ids);

            var vm = lista.Select(e =>
            {
                cobrosPorEntrega.TryGetValue(e.Id, out var totalCobrado);
                return new VMClienteEntregaLista
                {
                    Id = e.Id,
                    Fecha = e.Fecha,
                    IdContrato = e.IdContrato,
                    IdCliente = e.IdContratoNavigation.IdCliente,
                    Cliente = e.IdContratoNavigation?.IdClienteNavigation?.Nombre ?? "",
                    Establecimiento = e.IdContratoNavigation?.IdEstablecimientoNavigation?.Nombre ?? "",
                    IdEstado = e.IdEstado,
                    Estado = e.IdEstadoNavigation?.Nombre,
                    Subtotal = e.Subtotal,
                    Descuentos = e.Descuentos,
                    TotalIva = e.TotalIva,
                    ImporteTotal = e.ImporteTotal,
                    ImporteAbonado = totalCobrado > 0 ? totalCobrado : e.ImporteAbonado,
                    Saldo = e.ImporteTotal - (totalCobrado > 0 ? totalCobrado : e.ImporteAbonado),
                    CantidadProductos = e.ClientesEntregasProductos?.Count ?? 0,
                    NotaInterna = e.NotaInterna,
                    TieneCobros = totalCobrado > 0
                };
            }).ToList();

            return Ok(vm);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var e = await _service.Obtener(id);
            if (e == null)
                return NotFound();

            var resumenCobros = await _service.ObtenerCobros(id);
            var contrato = e.IdContratoNavigation;
            var cliente = contrato?.IdClienteNavigation;

            var detalle = new VMClienteEntregaDetalle
            {
                Id = e.Id,
                Fecha = e.Fecha,
                IdContrato = e.IdContrato,
                IdCliente = contrato?.IdCliente ?? 0,
                Cliente = cliente?.Nombre ?? "",
                Establecimiento = contrato?.IdEstablecimientoNavigation?.Nombre ?? "",
                IdSucursal = cliente?.IdSucursal ?? 0,
                Sucursal = cliente?.IdSucursalNavigation?.Nombre ?? "",
                IdEstado = e.IdEstado,
                Estado = e.IdEstadoNavigation?.Nombre,
                NotaInterna = e.NotaInterna,
                NotaCliente = e.NotaCliente,
                Subtotal = e.Subtotal,
                Descuentos = e.Descuentos,
                TotalIva = e.TotalIva,
                ImporteTotal = e.ImporteTotal,
                ImporteAbonado = resumenCobros?.TotalCobrado ?? e.ImporteAbonado,
                Saldo = resumenCobros?.SaldoPendiente ?? e.Saldo,
                TieneCobros = resumenCobros?.TieneCobros ?? false,
                PuedeEditar = true,
                PuedeEliminar = true,
                Lineas = (e.ClientesEntregasProductos ?? new List<ClientesEntregasProducto>())
                    .OrderBy(x => x.Id)
                    .Select(l => new VMClienteEntregaLinea
                    {
                        Id = l.Id,
                        IdProducto = l.IdProducto,
                        Producto = l.IdProductoNavigation?.Nombre ?? "",
                        Medida = l.IdProductoNavigation?.IdMedidaNavigation?.Nombre,
                        Cantidad = l.Cantidad,
                        PrecioVenta = l.PrecioVenta,
                        CostoUnitario = l.CostoUnitario,
                        PorcDescuento = l.PorcDescuento,
                        PorcIva = l.PorcIva,
                        DescUnitario = l.DescUnitario,
                        DescTotal = l.DescTotal,
                        PrecioVentacDesc = l.PrecioVentacDesc,
                        SubtotalcDesc = l.SubtotalcDesc,
                        IvaUnitario = l.Ivaunitario,
                        TotalIva = l.TotalIva,
                        PrecioVentaFinal = l.PrecioVentaFinal,
                        SubtotalFinal = l.SubtotalFinal,
                        Ganancia = l.Ganancia
                    })
                    .ToList()
            };

            return Ok(detalle);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEntregaGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entrega = MapEntrega(model);
            var lineas = MapLineas(model.Lineas);
            var cobros = MapCobros(model.Cobros);

            ServiceResult result = await _service.Insertar(entrega, lineas, cobros, idUsuario);

            return Ok(new
            {
                id = result.IdReferencia ?? entrega.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMClienteEntregaGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entrega = MapEntrega(model);
            entrega.Id = model.Id;
            var lineas = MapLineas(model.Lineas);
            var cobros = MapCobros(model.Cobros);

            ServiceResult result = await _service.Actualizar(entrega, lineas, cobros, idUsuario);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            ServiceResult result = await _service.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> Cobros(int id)
        {
            var resumen = await _service.ObtenerCobros(id);
            if (resumen == null)
                return NotFound();

            return Ok(new VMClienteEntregaCobrosResumen
            {
                IdEntrega = resumen.IdEntrega,
                ImporteTotal = resumen.ImporteTotal,
                TotalCobrado = resumen.TotalCobrado,
                SaldoPendiente = resumen.SaldoPendiente,
                TieneCobros = resumen.TieneCobros,
                Cobros = resumen.Cobros.Select(c => new VMClienteEntregaCobroItem
                {
                    IdCobro = c.IdCobro,
                    IdMovimientoCc = c.IdMovimientoCc,
                    IdCuenta = c.IdCuenta,
                    IdSucursal = c.IdSucursal,
                    Fecha = c.Fecha,
                    Concepto = c.Concepto,
                    Importe = c.Importe,
                    Cuenta = c.Cuenta,
                    Sucursal = c.Sucursal,
                    Usuario = c.Usuario
                }).ToList()
            });
        }

        private static ClientesEntrega MapEntrega(VMClienteEntregaGuardar model)
        {
            return new ClientesEntrega
            {
                Id = model.Id,
                Fecha = model.Fecha == default ? DateTime.Now : model.Fecha,
                IdContrato = model.IdContrato,
                IdEstado = model.IdEstado,
                NotaInterna = model.NotaInterna?.Trim(),
                NotaCliente = model.NotaCliente?.Trim()
            };
        }

        private static List<ClientesEntregasProducto> MapLineas(List<VMClienteEntregaLineaGuardar>? lineas)
        {
            return (lineas ?? new List<VMClienteEntregaLineaGuardar>())
                .Where(x => x.IdProducto > 0 && x.Cantidad > 0)
                .Select(x => new ClientesEntregasProducto
                {
                    Id = x.Id,
                    IdProducto = x.IdProducto,
                    Cantidad = x.Cantidad,
                    PrecioVenta = x.PrecioVenta,
                    CostoUnitario = x.CostoUnitario,
                    PorcDescuento = x.PorcDescuento,
                    PorcIva = x.PorcIva
                })
                .ToList();
        }

        private static List<EntregaCobroRegistrar> MapCobros(List<VMClienteEntregaCobroRegistrar>? cobros)
        {
            return (cobros ?? new List<VMClienteEntregaCobroRegistrar>())
                .Where(x => x.IdCuenta > 0 && x.Importe > 0)
                .Select(x => new EntregaCobroRegistrar
                {
                    IdCobro = x.IdCobro,
                    IdMovimientoCc = x.IdMovimientoCc,
                    IdCuenta = x.IdCuenta,
                    Fecha = x.Fecha == default ? DateTime.Now : x.Fecha,
                    Concepto = x.Concepto?.Trim() ?? "",
                    Importe = x.Importe
                })
                .ToList();
        }
    }
}
