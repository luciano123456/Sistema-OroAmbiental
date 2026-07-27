using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesContactosController : Controller
    {
        private readonly IClientesContactosService _service;

        public ClientesContactosController(IClientesContactosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorCliente(int idCliente)
        {
            var items = await _service.ObtenerPorCliente(idCliente);

            var lista = items.Select(x => new VMClienteContacto
            {
                Id = x.Id,
                IdCliente = x.IdCliente,
                Nombre = x.Nombre,
                Puesto = x.Puesto,
                Telefono = x.Telefono,
                TelefonoAlt = x.TelefonoAlt,
                Email = x.Email
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteContacto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var contacto = new ClientesContacto
            {
                IdCliente = model.IdCliente,
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
        public async Task<IActionResult> Actualizar([FromBody] VMClienteContacto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var contacto = new ClientesContacto
            {
                Id = model.Id,
                IdCliente = model.IdCliente,
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
