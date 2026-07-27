using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProductosPreciosController : Controller
    {
        private readonly IProductosPreciosService _service;

        public ProductosPreciosController(IProductosPreciosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorProducto(int idProducto)
        {
            var items = await _service.ObtenerMatrizPorProducto(idProducto);

            var lista = items.Select(x => new VMProductoPrecioLista
            {
                Id = x.Id,
                IdListaPrecio = x.IdListaPrecio,
                ListaPrecio = x.ListaPrecio,
                PrecioVenta = x.PrecioVenta,
                PorcRentabilidad = x.PorcRentabilidad
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> GuardarPorProducto([FromBody] VMProductoPreciosGuardar model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var precios = (model.Precios ?? new List<VMProductoPrecioLista>())
                .Select(p => new ProductoPrecioListaDto
                {
                    Id = p.Id,
                    IdListaPrecio = p.IdListaPrecio,
                    ListaPrecio = p.ListaPrecio,
                    PrecioVenta = p.PrecioVenta,
                    PorcRentabilidad = p.PorcRentabilidad
                });

            var result = await _service.GuardarPorProducto(model.IdProducto, precios, idUsuario);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }
    }
}
