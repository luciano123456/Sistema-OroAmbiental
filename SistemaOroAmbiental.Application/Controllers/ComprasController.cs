using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ComprasController : Controller
    {
        private readonly IComprasService _service;

        public ComprasController(IComprasService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [AllowAnonymous]
        public IActionResult NuevoModif(int id = 0, int idProveedor = 0)
        {
            ViewBag.Id = id;
            ViewBag.IdProveedor = idProveedor;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ListaFiltrada([FromBody] VMCompraFiltro filtro)
        {
            var lista = await _service.ListarFiltrado(
                filtro?.FechaDesde,
                filtro?.FechaHasta,
                filtro?.IdProveedor,
                filtro?.IdSucursal,
                filtro?.Texto);

            var ids = lista.Select(x => x.Id).ToList();
            var pagosPorCompra = await _service.SumarPagosPorCompras(ids);

            var vm = lista.Select(c =>
            {
                pagosPorCompra.TryGetValue(c.Id, out var totalPagado);
                return new VMCompraLista
                {
                    Id = c.Id,
                    Fecha = c.Fecha,
                    IdProveedor = c.IdProveedor,
                    Proveedor = c.IdProveedorNavigation?.Nombre ?? "",
                    IdSucursal = c.IdSucursal,
                    Sucursal = c.IdSucursalNavigation?.Nombre ?? "",
                    Subtotal = c.Subtotal,
                    Descuentos = c.Descuentos,
                    TotalIva = c.TotalIva,
                    ImporteTotal = c.ImporteTotal,
                    CantidadProductos = c.ComprasProductos?.Count ?? 0,
                    NotaInterna = c.NotaInterna,
                    TienePagos = totalPagado > 0,
                    TotalPagado = totalPagado,
                    SaldoPendiente = Math.Max(0, c.ImporteTotal - totalPagado)
                };
            }).ToList();

            return Ok(vm);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var c = await _service.Obtener(id);
            if (c == null)
                return NotFound();

            var resumenPagos = await _service.ObtenerPagos(id);

            var detalle = new VMCompraDetalle
            {
                Id = c.Id,
                Fecha = c.Fecha,
                IdProveedor = c.IdProveedor,
                Proveedor = c.IdProveedorNavigation?.Nombre ?? "",
                IdSucursal = c.IdSucursal,
                Sucursal = c.IdSucursalNavigation?.Nombre ?? "",
                NotaInterna = c.NotaInterna,
                Subtotal = c.Subtotal,
                Descuentos = c.Descuentos,
                TotalIva = c.TotalIva,
                ImporteTotal = c.ImporteTotal,
                TienePagos = resumenPagos?.TienePagos ?? false,
                TotalPagado = resumenPagos?.TotalPagado ?? 0,
                SaldoPendiente = resumenPagos?.SaldoPendiente ?? c.ImporteTotal,
                PuedeEditar = true,
                PuedeEliminar = true,
                Lineas = (c.ComprasProductos ?? new List<ComprasProducto>())
                    .OrderBy(x => x.Id)
                    .Select(l => new VMCompraLinea
                    {
                        Id = l.Id,
                        IdProducto = l.IdProducto,
                        Producto = l.IdProductoNavigation?.Nombre ?? "",
                        Medida = l.IdProductoNavigation?.IdMedidaNavigation?.Nombre,
                        Cantidad = l.Cantidad,
                        CostoUnitario = l.CostoUnitario,
                        PorcDescuento = l.PorcDescuento,
                        PorcIva = l.PorcIva,
                        DescUnitario = l.DescUnitario,
                        DescTotal = l.DescTotal,
                        CostoUnitCdesc = l.CostoUnitCdesc,
                        SubtotalCdesc = l.SubtotalCdesc,
                        IvaUnitario = l.Ivaunitario,
                        IvaTotal = l.Ivatotal,
                        CostoUnitFinal = l.CostoUnitFinal,
                        SubtotalFinal = l.SubtotalFinal
                    })
                    .ToList()
            };

            return Ok(detalle);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCompraGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var compra = MapCompra(model);
            var lineas = MapLineas(model.Lineas);
            var pagos = MapPagos(model.Pagos);

            ServiceResult result = await _service.Insertar(compra, lineas, pagos, idUsuario);

            return Ok(new
            {
                id = result.IdReferencia ?? compra.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCompraGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var compra = MapCompra(model);
            compra.Id = model.Id;
            var lineas = MapLineas(model.Lineas);
            var pagos = MapPagos(model.Pagos);

            ServiceResult result = await _service.Actualizar(compra, lineas, pagos, idUsuario);

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
        public async Task<IActionResult> Pagos(int id)
        {
            var resumen = await _service.ObtenerPagos(id);
            if (resumen == null)
                return NotFound();

            return Ok(MapPagosResumen(resumen));
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarPago([FromBody] VMCompraPagoRegistrar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var result = await _service.RegistrarPago(
                model.IdCompra,
                model.IdCuenta,
                model.Fecha == default ? DateTime.Now : model.Fecha,
                model.Concepto,
                model.Importe,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarPago(int idMovimientoCc, int idCompra)
        {
            var result = await _service.EliminarPago(idMovimientoCc, idCompra);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static VMCompraPagosResumen MapPagosResumen(CompraPagosResumen r)
        {
            return new VMCompraPagosResumen
            {
                IdCompra = r.IdCompra,
                ImporteTotal = r.ImporteTotal,
                TotalPagado = r.TotalPagado,
                SaldoPendiente = r.SaldoPendiente,
                TienePagos = r.TienePagos,
                Pagos = r.Pagos.Select(p => new VMCompraPagoItem
                {
                    IdPago = p.IdPago,
                    IdCuenta = p.IdCuenta,
                    IdSucursal = p.IdSucursal,
                    IdMovimientoCc = p.IdMovimientoCc,
                    Fecha = p.Fecha,
                    Concepto = p.Concepto,
                    Importe = p.Importe,
                    Cuenta = p.Cuenta,
                    Sucursal = p.Sucursal,
                    Usuario = p.Usuario
                }).ToList()
            };
        }

        private static Compra MapCompra(VMCompraGuardar model)
        {
            return new Compra
            {
                Id = model.Id,
                Fecha = model.Fecha == default ? DateTime.Now : model.Fecha,
                IdProveedor = model.IdProveedor,
                IdSucursal = model.IdSucursal,
                NotaInterna = model.NotaInterna?.Trim()
            };
        }

        private static List<ComprasProducto> MapLineas(List<VMCompraLineaGuardar>? lineas)
        {
            return (lineas ?? new List<VMCompraLineaGuardar>())
                .Where(x => x.IdProducto > 0 && x.Cantidad > 0)
                .Select(x => new ComprasProducto
                {
                    Id = x.Id,
                    IdProducto = x.IdProducto,
                    Cantidad = x.Cantidad,
                    CostoUnitario = x.CostoUnitario,
                    PorcDescuento = x.PorcDescuento,
                    PorcIva = x.PorcIva
                })
                .ToList();
        }

        private static List<CompraPagoRegistrar> MapPagos(List<VMCompraPagoRegistrar>? pagos)
        {
            return (pagos ?? new List<VMCompraPagoRegistrar>())
                .Where(x => x.IdCuenta > 0 && x.Importe > 0)
                .Select(x => new CompraPagoRegistrar
                {
                    IdPago = x.IdPago,
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
