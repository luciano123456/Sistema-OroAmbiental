using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProveedoresCuentaCorrienteController : Controller
    {
        private readonly IProveedoresCuentaCorrienteService _service;

        public ProveedoresCuentaCorrienteController(IProveedoresCuentaCorrienteService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ListaProveedores(string? buscar, bool soloSaldoActivo = false)
        {
            var data = await _service.ListarProveedores(buscar, soloSaldoActivo);

            var lista = data.Select(x => new VMProveedorCCProveedor
            {
                Id = x.proveedor.Id,
                Nombre = x.proveedor.Nombre,
                Saldo = x.saldo
            });

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> Movimiento(int id)
        {
            var (mov, cuenta, sucursal, saldo) = await _service.ObtenerMovimiento(id);

            if (mov == null)
                return NotFound();

            var puedeEliminar = mov.TipoMovimiento is ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR
                or ProveedoresCuentaCorrienteRepository.TIPO_AJUSTE_PROVEEDOR;

            return Ok(new VMProveedorCCDetalleMovimiento
            {
                Id = mov.Id,
                IdProveedor = mov.IdCuentaCorrienteNavigation.IdProveedor,
                TipoMovimiento = mov.TipoMovimiento,
                Fecha = mov.Fecha,
                Concepto = mov.Concepto,
                Debe = mov.Debe,
                Haber = mov.Haber,
                Saldo = saldo,
                Cuenta = cuenta,
                Sucursal = sucursal,
                PuedeEliminar = puedeEliminar
            });
        }

        [HttpPost]
        public async Task<IActionResult> Movimientos([FromBody] VMProveedorCCFiltro filtro)
        {
            if (!filtro.IdProveedor.HasValue || filtro.IdProveedor <= 0)
                return BadRequest("Debe seleccionar un proveedor.");

            var movimientos = await _service.Movimientos(
                filtro.IdProveedor.Value,
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.TipoMovimiento,
                filtro.Texto);

            decimal saldo = await _service.SaldoAnterior(filtro.IdProveedor.Value, filtro.FechaDesde);

            var lista = new List<VMProveedorCCMovimiento>
            {
                new()
                {
                    Id = 0,
                    Fecha = filtro.FechaDesde ?? DateTime.Today,
                    TipoMovimiento = "SALDO_ANTERIOR",
                    Concepto = "Saldo anterior",
                    Debe = 0,
                    Haber = 0,
                    Saldo = saldo,
                    PuedeEliminar = false,
                    Origen = ""
                }
            };

            foreach (var m in movimientos)
            {
                saldo += m.Debe - m.Haber;

                var puedeEliminar = m.TipoMovimiento is ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR
                    or ProveedoresCuentaCorrienteRepository.TIPO_AJUSTE_PROVEEDOR;

                lista.Add(new VMProveedorCCMovimiento
                {
                    Id = m.Id,
                    Fecha = m.Fecha,
                    TipoMovimiento = EtiquetaTipoMov(m.TipoMovimiento),
                    Concepto = m.Concepto,
                    Debe = m.Debe,
                    Haber = m.Haber,
                    Saldo = saldo,
                    PuedeEliminar = puedeEliminar,
                    Origen = ObtenerOrigen(m.TipoMovimiento)
                });
            }

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Resumen([FromBody] VMProveedorCCFiltro filtro)
        {
            if (!filtro.IdProveedor.HasValue || filtro.IdProveedor <= 0)
                return BadRequest("Debe seleccionar un proveedor.");

            var saldoAnterior = await _service.SaldoAnterior(
                filtro.IdProveedor.Value,
                filtro.FechaDesde);

            var (debe, haber, cantidad) = await _service.Resumen(
                filtro.IdProveedor.Value,
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.TipoMovimiento,
                filtro.Texto);

            return Ok(new VMProveedorCCResumen
            {
                SaldoAnterior = saldoAnterior,
                Debe = debe,
                Haber = haber,
                SaldoActual = saldoAnterior + debe - haber,
                CantidadMovimientos = cantidad
            });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarPago([FromBody] VMProveedorCCPago model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var result = await _service.RegistrarPago(
                model.IdProveedor,
                model.IdCuenta,
                model.Fecha,
                model.Concepto,
                model.Importe,
                idUsuario,
                model.IdCompra);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarAjuste([FromBody] VMProveedorCCAjuste model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var result = await _service.RegistrarAjuste(
                model.IdProveedor,
                model.IdCuenta,
                model.Fecha,
                model.Concepto,
                model.Debe,
                model.Haber,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static string EtiquetaTipoMov(string tipo) => tipo switch
        {
            ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR => "Pago",
            ProveedoresCuentaCorrienteRepository.TIPO_AJUSTE_PROVEEDOR => "Ajuste",
            ProveedoresCuentaCorrienteRepository.TIPO_COMPRA => "Compra",
            _ => tipo
        };

        private static string ObtenerOrigen(string tipo) => tipo switch
        {
            ProveedoresCuentaCorrienteRepository.TIPO_PAGO_PROVEEDOR => "PAGO",
            ProveedoresCuentaCorrienteRepository.TIPO_AJUSTE_PROVEEDOR => "AJUSTE",
            ProveedoresCuentaCorrienteRepository.TIPO_COMPRA => "COMPRAS",
            _ => "SISTEMA"
        };
    }
}
