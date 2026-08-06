using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;
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
        public IActionResult Index(int idCliente = 0)
        {
            ViewBag.IdCliente = idCliente;
            return View();
        }

        [AllowAnonymous]
        public IActionResult NuevoModif(int id = 0, int idCliente = 0, bool volverCliente = false)
        {
            // Usar IdEntrega (no ViewBag.Id): en algunos layouts/filtros "Id" se pisa y la pantalla queda en alta.
            ViewBag.IdEntrega = id;
            ViewBag.Id = id; // compat vistas que aún lean Id
            ViewBag.IdCliente = idCliente;
            ViewBag.VolverCliente = volverCliente && idCliente > 0;
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
                    IdEstablecimiento = e.IdEstablecimiento > 0
                        ? e.IdEstablecimiento
                        : e.IdContratoNavigation?.IdEstablecimiento,
                    IdCliente = e.IdCliente,
                    Cliente = e.IdClienteNavigation?.Nombre ?? "",
                    Establecimiento = e.IdEstablecimientoNavigation?.Nombre
                        ?? e.IdContratoNavigation?.IdEstablecimientoNavigation?.Nombre
                        ?? "",
                    IdEstado = e.IdEstado,
                    Estado = e.IdEstadoNavigation?.Nombre,
                    Subtotal = e.Subtotal,
                    Descuentos = e.Descuentos,
                    TotalIva = e.TotalIva,
                    ImporteTotal = e.ImporteTotal,
                    ImporteAbonado = totalCobrado > 0 ? totalCobrado : e.ImporteAbonado,
                    Saldo = e.ImporteTotal - (totalCobrado > 0 ? totalCobrado : e.ImporteAbonado),
                    CantidadProductos = (e.ClientesEntregasProductos?.Count ?? 0)
                        + (e.ClientesEntregasProductosRecuperados?.Count ?? 0),
                    NotaInterna = e.NotaInterna,
                    TieneCobros = totalCobrado > 0
                };
            }).ToList();

            return Ok(vm);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            try
            {
                var e = await _service.Obtener(id);
                if (e == null)
                    return NotFound();

                var resumenCobros = await _service.ObtenerCobros(id);
                var cliente = e.IdClienteNavigation;
                var contrato = e.IdContratoNavigation;

                var detalle = new VMClienteEntregaDetalle
                {
                    Id = e.Id,
                    Fecha = e.Fecha,
                    IdContrato = e.IdContrato,
                    IdEstablecimiento = e.IdEstablecimiento > 0
                        ? e.IdEstablecimiento
                        : contrato?.IdEstablecimiento,
                    IdCliente = e.IdCliente,
                    Cliente = cliente?.Nombre ?? "",
                    Establecimiento = e.IdEstablecimientoNavigation?.Nombre
                        ?? contrato?.IdEstablecimientoNavigation?.Nombre
                        ?? "",
                    IdSucursal = cliente?.IdSucursal ?? 0,
                    Sucursal = cliente?.IdSucursalNavigation?.Nombre ?? "",
                    IdEstado = e.IdEstado,
                    Estado = e.IdEstadoNavigation?.Nombre,
                    IdCamion = e.IdCamion,
                    Camion = e.IdCamionNavigation?.Nombre,
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
                        .Where(l => l.TipoMovimiento != ClientesEntregasRepository.TIPO_LINEA_RECUPERADO)
                        .OrderBy(x => x.Id)
                        .Select(MapLineaOperacionVm)
                        .ToList(),
                    LineasRecuperadas = MapearLineasRecuperadas(e)
                };

                return Ok(detalle);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al obtener la entrega.", detalle = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEntregaGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entrega = MapEntrega(model);
            var (lineas, lineasRecuperadas) = MapLineasDesdeGuardar(model);
            var cobros = MapCobros(model.Cobros);

            ServiceResult result = await _service.Insertar(entrega, lineas, lineasRecuperadas, cobros, idUsuario);

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
            var (lineas, lineasRecuperadas) = MapLineasDesdeGuardar(model);
            var cobros = MapCobros(model.Cobros);

            ServiceResult result = await _service.Actualizar(entrega, lineas, lineasRecuperadas, cobros, idUsuario);

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
                IdCliente = model.IdCliente,
                IdEstablecimiento = model.IdEstablecimiento,
                IdContrato = model.IdContrato,
                IdEstado = model.IdEstado,
                IdCamion = model.IdCamion,
                NotaInterna = model.NotaInterna?.Trim(),
                NotaCliente = model.NotaCliente?.Trim()
            };
        }

        private static (List<ClientesEntregasProducto>, List<ClientesEntregasProductosRecuperado>) MapLineasDesdeGuardar(
            VMClienteEntregaGuardar model)
        {
            var operacion = new List<ClientesEntregasProducto>();
            var recuperadas = new List<ClientesEntregasProductosRecuperado>();

            foreach (var x in model.Lineas ?? new List<VMClienteEntregaLineaGuardar>())
            {
                if (x.IdProducto <= 0 || x.Cantidad <= 0)
                    continue;

                if (x.TipoMovimiento == ClientesEntregasRepository.TIPO_LINEA_RECUPERADO)
                    recuperadas.Add(MapLineaRecuperadaGuardar(x));
                else
                    operacion.Add(MapLineaOperacionGuardar(x));
            }

            foreach (var x in model.LineasRecuperadas ?? new List<VMClienteEntregaLineaGuardar>())
            {
                if (x.IdProducto <= 0 || x.Cantidad <= 0)
                    continue;

                recuperadas.Add(MapLineaRecuperadaGuardar(x));
            }

            return (operacion, recuperadas);
        }

        private static ClientesEntregasProducto MapLineaOperacionGuardar(VMClienteEntregaLineaGuardar x)
            => new()
            {
                Id = x.Id,
                IdProducto = x.IdProducto,
                IdListaPrecio = x.IdListaPrecio > 0 ? x.IdListaPrecio : null,
                TipoMovimiento = MapTipoMovimientoLinea(x.TipoMovimiento),
                Cantidad = x.Cantidad,
                PrecioVenta = x.PrecioVenta,
                CostoUnitario = x.CostoUnitario,
                PorcDescuento = x.PorcDescuento,
                PorcIva = x.PorcIva
            };

        private static ClientesEntregasProductosRecuperado MapLineaRecuperadaGuardar(VMClienteEntregaLineaGuardar x)
            => new()
            {
                Id = x.Id,
                IdProducto = x.IdProducto,
                IdListaPrecio = x.IdListaPrecio > 0 ? x.IdListaPrecio : null,
                Cantidad = x.Cantidad,
                PrecioVenta = x.PrecioVenta,
                CostoUnitario = x.CostoUnitario,
                PorcDescuento = x.PorcDescuento,
                PorcIva = x.PorcIva
            };

        private static int MapTipoMovimientoLinea(int tipo)
            => tipo == ClientesEntregasRepository.TIPO_LINEA_RETIRO
                ? ClientesEntregasRepository.TIPO_LINEA_RETIRO
                : ClientesEntregasRepository.TIPO_LINEA_ENTREGA;

        private static List<VMClienteEntregaLinea> MapearLineasRecuperadas(ClientesEntrega e)
        {
            var desdeTabla = (e.ClientesEntregasProductosRecuperados ?? new List<ClientesEntregasProductosRecuperado>())
                .OrderBy(x => x.Id)
                .Select(MapLineaRecuperadaVm);

            var legacy = (e.ClientesEntregasProductos ?? new List<ClientesEntregasProducto>())
                .Where(l => l.TipoMovimiento == ClientesEntregasRepository.TIPO_LINEA_RECUPERADO)
                .OrderBy(x => x.Id)
                .Select(l =>
                {
                    var vm = MapLineaOperacionVm(l);
                    vm.TipoMovimiento = ClientesEntregasRepository.TIPO_LINEA_RECUPERADO;
                    return vm;
                });

            return desdeTabla.Concat(legacy).ToList();
        }

        private static VMClienteEntregaLinea MapLineaOperacionVm(ClientesEntregasProducto l)
            => new()
            {
                Id = l.Id,
                IdProducto = l.IdProducto,
                IdListaPrecio = l.IdListaPrecio,
                TipoMovimiento = l.TipoMovimiento,
                Producto = l.IdProductoNavigation?.Nombre ?? "",
                Medida = l.IdProductoNavigation?.IdMedidaNavigation?.Nombre,
                ListaPrecio = l.IdListaPrecioNavigation?.Nombre,
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
            };

        private static VMClienteEntregaLinea MapLineaRecuperadaVm(ClientesEntregasProductosRecuperado l)
            => new()
            {
                Id = l.Id,
                IdProducto = l.IdProducto,
                IdListaPrecio = l.IdListaPrecio,
                TipoMovimiento = ClientesEntregasRepository.TIPO_LINEA_RECUPERADO,
                Producto = l.IdProductoNavigation?.Nombre ?? "",
                Medida = l.IdProductoNavigation?.IdMedidaNavigation?.Nombre,
                ListaPrecio = l.IdListaPrecioNavigation?.Nombre,
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
            };

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
