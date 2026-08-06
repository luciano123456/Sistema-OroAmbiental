using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesEstablecimientosProductosController : Controller
    {
        private readonly IClientesEstablecimientosProductosService _service;

        public ClientesEstablecimientosProductosController(IClientesEstablecimientosProductosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorEstablecimiento(int idEstablecimiento)
        {
            var items = await _service.ObtenerPorEstablecimiento(idEstablecimiento);

            var lista = items.Select(x => new VMClienteEstablecimientoProducto
            {
                Id = x.Id,
                IdEstablecimiento = x.IdEstablecimiento,
                IdProducto = x.IdProducto,
                Cantidad = x.Cantidad,
                IdListaPrecio = x.IdListaPrecio,
                PrecioVenta = x.PrecioVenta,
                Producto = x.IdProductoNavigation?.Nombre ?? "",
                Abreviatura = x.IdProductoNavigation?.Abreviatura,
                ListaPrecio = x.IdListaPrecioNavigation?.Nombre
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEstablecimientoProducto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var item = MapEntidad(model, idUsuario, esNuevo: true);
            var result = await _service.Insertar(item);

            return Ok(new
            {
                id = item.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMClienteEstablecimientoProducto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var item = MapEntidad(model, idUsuario, esNuevo: false);
            var result = await _service.Actualizar(item);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        private static ClientesEstablecimientosProducto MapEntidad(VMClienteEstablecimientoProducto model, int idUsuario, bool esNuevo)
        {
            var item = new ClientesEstablecimientosProducto
            {
                Id = model.Id,
                IdEstablecimiento = model.IdEstablecimiento,
                IdProducto = model.IdProducto,
                Cantidad = model.Cantidad,
                IdListaPrecio = model.IdListaPrecio > 0 ? model.IdListaPrecio : null,
                PrecioVenta = model.PrecioVenta
            };

            if (esNuevo)
            {
                item.IdUsuarioRegistra = idUsuario;
                item.FechaUsuarioRegistra = DateTime.Now;
            }
            else
            {
                item.IdUsuarioModifica = idUsuario;
                item.FechaUsuarioModifica = DateTime.Now;
            }

            return item;
        }
    }
}
