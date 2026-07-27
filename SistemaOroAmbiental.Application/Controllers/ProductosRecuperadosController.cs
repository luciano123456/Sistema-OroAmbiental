using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProductosRecuperadosController : Controller
    {
        private readonly IProductosRecuperadosService _service;

        public ProductosRecuperadosController(IProductosRecuperadosService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpPost]
        public async Task<IActionResult> ListaHistorial([FromBody] VMProductosRecuperadosFiltro? filtro)
            => Ok(await _service.ListarHistorial(MapFiltro(filtro)));

        [HttpPost]
        public async Task<IActionResult> Dashboard([FromBody] VMProductosRecuperadosFiltro? filtro)
            => Ok(await _service.ObtenerDashboard(MapFiltro(filtro)));

        [HttpGet]
        public async Task<IActionResult> StockRecuperado(int? idSucursal, string? buscar)
            => Ok(await _service.ListarStockRecuperado(idSucursal, buscar));

        [HttpPost]
        public async Task<IActionResult> RegistrarManual([FromBody] VMProductoRecuperadoRegistrar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var result = await _service.RegistrarManual(
                model.IdSucursal,
                model.IdProducto,
                model.Cantidad,
                model.Fecha == default ? DateTime.Now : model.Fecha,
                model.Concepto,
                idUsuario);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarManual(int id)
        {
            var result = await _service.EliminarMovimientoManual(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static ProductosRecuperadosFiltroDto MapFiltro(VMProductosRecuperadosFiltro? filtro)
            => new()
            {
                IdSucursal = filtro?.IdSucursal,
                IdProducto = filtro?.IdProducto,
                IdCliente = filtro?.IdCliente,
                FechaDesde = filtro?.FechaDesde,
                FechaHasta = filtro?.FechaHasta,
                Texto = filtro?.Texto
            };
    }
}
