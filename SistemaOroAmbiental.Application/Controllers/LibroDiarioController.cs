using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class LibroDiarioController : Controller
    {
        private readonly ILibroDiarioService _service;

        public LibroDiarioController(ILibroDiarioService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            ViewBag.EsBancario = false;
            ViewBag.TituloLibro = "Libro diario — Caja efectivo";
            return View();
        }

        [AllowAnonymous]
        public IActionResult Bancaria()
        {
            ViewBag.EsBancario = true;
            ViewBag.TituloLibro = "Libro diario — Caja bancaria";
            return View("Index");
        }

        [HttpGet]
        public async Task<IActionResult> Conceptos(bool soloActivos = true)
        {
            var data = await _service.ListarConceptos(soloActivos);
            return Ok(data.Select(x => new VMLibroDiarioConcepto
            {
                Id = x.Id,
                Nombre = x.Nombre,
                PrecioUnitario = x.PrecioUnitario,
                IdProducto = x.IdProducto,
                AfectaInventario = x.AfectaInventario,
                TipoStock = x.TipoStock
            }));
        }

        [HttpPost]
        public async Task<IActionResult> Movimientos([FromBody] VMLibroDiarioFiltro? filtro)
            => Ok(await _service.ListarMovimientos(MapFiltro(filtro)));

        [HttpPost]
        public async Task<IActionResult> Resumen([FromBody] VMLibroDiarioFiltro? filtro)
        {
            var (resumen, saldoAnterior) = await _service.ObtenerResumen(MapFiltro(filtro));
            return Ok(new VMLibroDiarioResumen
            {
                SaldoAnterior = saldoAnterior,
                TotalDebe = resumen.TotalDebe,
                TotalHaber = resumen.TotalHaber,
                SaldoFinal = resumen.SaldoFinal,
                CantidadMovimientos = resumen.CantidadMovimientos
            });
        }

        [HttpGet]
        public async Task<IActionResult> Movimiento(int id)
        {
            var mov = await _service.ObtenerMovimiento(id);
            return mov == null ? NotFound() : Ok(mov);
        }

        [HttpPost]
        public async Task<IActionResult> Guardar([FromBody] LibroDiarioMovimientoDto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = model.Id > 0
                ? await _service.ActualizarMovimiento(model, idUsuario)
                : await _service.InsertarMovimiento(model, idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.EliminarMovimiento(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpGet]
        public async Task<IActionResult> AutocompleteClientes(string? buscar)
        {
            var data = await _service.AutocompleteClientes(buscar);
            return Ok(data.Select(x => new VMLibroDiarioAutocomplete { Id = x.Id, Nombre = x.Nombre }));
        }

        [HttpGet]
        public async Task<IActionResult> AutocompleteProveedores(string? buscar)
        {
            var data = await _service.AutocompleteProveedores(buscar);
            return Ok(data.Select(x => new VMLibroDiarioAutocomplete { Id = x.Id, Nombre = x.Nombre }));
        }

        private static LibroDiarioFiltroDto MapFiltro(VMLibroDiarioFiltro? filtro)
            => new()
            {
                FechaDesde = filtro?.FechaDesde,
                FechaHasta = filtro?.FechaHasta,
                EsBancario = filtro?.EsBancario,
                IdCliente = filtro?.IdCliente,
                IdCamion = filtro?.IdCamion,
                IdSemana = filtro?.IdSemana,
                IdDia = filtro?.IdDia,
                Texto = filtro?.Texto
            };
    }
}
