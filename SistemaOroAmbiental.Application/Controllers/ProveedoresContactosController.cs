using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProveedoresContactosController : Controller
    {
        private readonly IProveedoresContactosService _service;

        public ProveedoresContactosController(IProveedoresContactosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorProveedor(int idProveedor)
        {
            var items = await _service.ObtenerPorProveedor(idProveedor);

            var lista = items.Select(x => new VMProveedorContacto
            {
                Id = x.Id,
                IdProveedor = x.IdProveedor,
                Nombre = x.Nombre,
                Puesto = x.Puesto,
                Telefono = x.Telefono,
                TelefonoAlt = x.TelefonoAlt,
                Email = x.Email
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProveedorContacto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var contacto = new ProveedoresContacto
            {
                IdProveedor = model.IdProveedor,
                Nombre = model.Nombre?.Trim() ?? "",
                Puesto = model.Puesto,
                Telefono = model.Telefono,
                TelefonoAlt = model.TelefonoAlt,
                Email = model.Email,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            var result = await _service.Insertar(contacto);

            return Ok(new
            {
                id = contacto.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProveedorContacto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var contacto = new ProveedoresContacto
            {
                Id = model.Id,
                IdProveedor = model.IdProveedor,
                Nombre = model.Nombre?.Trim() ?? "",
                Puesto = model.Puesto,
                Telefono = model.Telefono,
                TelefonoAlt = model.TelefonoAlt,
                Email = model.Email,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            var result = await _service.Actualizar(contacto);

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
    }
}
