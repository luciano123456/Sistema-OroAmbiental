using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesCuentaCorrienteController : Controller
    {
        private readonly IClientesCuentaCorrienteService _service;

        public ClientesCuentaCorrienteController(IClientesCuentaCorrienteService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ListaClientes(string? buscar, bool soloSaldoActivo = false)
        {
            var data = await _service.ListarClientes(buscar, soloSaldoActivo);

            var lista = data.Select(x => new VMClienteCCCliente
            {
                Id = x.cliente.Id,
                Nombre = x.cliente.Nombre,
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

            var puedeEliminar = mov.TipoMovimiento is ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE
                or ClientesCuentaCorrienteRepository.TIPO_AJUSTE_CLIENTE;

            return Ok(new VMClienteCCDetalleMovimiento
            {
                Id = mov.Id,
                IdCliente = mov.IdCuentaCorrienteNavigation.IdCliente,
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
        public async Task<IActionResult> Movimientos([FromBody] VMClienteCCFiltro filtro)
        {
            if (!filtro.IdCliente.HasValue || filtro.IdCliente <= 0)
                return BadRequest("Debe seleccionar un cliente.");

            var movimientos = await _service.Movimientos(
                filtro.IdCliente.Value,
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.TipoMovimiento,
                filtro.Texto);

            decimal saldo = await _service.SaldoAnterior(filtro.IdCliente.Value, filtro.FechaDesde);

            var lista = new List<VMClienteCCMovimiento>
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

                var puedeEliminar = m.TipoMovimiento is ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE
                    or ClientesCuentaCorrienteRepository.TIPO_AJUSTE_CLIENTE;

                lista.Add(new VMClienteCCMovimiento
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
        public async Task<IActionResult> Resumen([FromBody] VMClienteCCFiltro filtro)
        {
            if (!filtro.IdCliente.HasValue || filtro.IdCliente <= 0)
                return BadRequest("Debe seleccionar un cliente.");

            var saldoAnterior = await _service.SaldoAnterior(
                filtro.IdCliente.Value,
                filtro.FechaDesde);

            var (debe, haber, cantidad) = await _service.Resumen(
                filtro.IdCliente.Value,
                filtro.FechaDesde,
                filtro.FechaHasta,
                filtro.TipoMovimiento,
                filtro.Texto);

            return Ok(new VMClienteCCResumen
            {
                SaldoAnterior = saldoAnterior,
                Debe = debe,
                Haber = haber,
                SaldoActual = saldoAnterior + debe - haber,
                CantidadMovimientos = cantidad
            });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarCobro([FromBody] VMClienteCCCobro model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var result = await _service.RegistrarCobro(
                model.IdCliente,
                model.IdCuenta,
                model.Fecha,
                model.Concepto,
                model.Importe,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarAjuste([FromBody] VMClienteCCAjuste model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var result = await _service.RegistrarAjuste(
                model.IdCliente,
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
            ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE => "Cobro",
            ClientesCuentaCorrienteRepository.TIPO_AJUSTE_CLIENTE => "Ajuste",
            "ENTREGA" => "Entrega",
            _ => tipo
        };

        private static string ObtenerOrigen(string tipo) => tipo switch
        {
            ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE => "COBRO",
            ClientesCuentaCorrienteRepository.TIPO_AJUSTE_CLIENTE => "AJUSTE",
            "ENTREGA" => "ENTREGAS",
            _ => "SISTEMA"
        };
    }
}
