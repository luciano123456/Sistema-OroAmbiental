using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesEstablecimientosContactosController : Controller
    {
        private readonly IClientesEstablecimientosContactosService _service;

        public ClientesEstablecimientosContactosController(IClientesEstablecimientosContactosService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorEstablecimiento(int idEstablecimiento)
        {
            var items = await _service.ObtenerPorEstablecimiento(idEstablecimiento);

            var lista = items.Select(x => new VMClienteEstablecimientoContacto
            {
                Id = x.Id,
                IdEstablecimiento = x.IdEstablecimiento,
                Nombre = x.Nombre,
                Puesto = x.Puesto,
                Telefono = x.Telefono,
                TelefonoAlt = x.TelefonoAlt,
                Email = x.Email
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEstablecimientoContacto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var contacto = new ClientesEstablecimientosContacto
            {
                IdEstablecimiento = model.IdEstablecimiento,
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
        public async Task<IActionResult> Actualizar([FromBody] VMClienteEstablecimientoContacto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var contacto = new ClientesEstablecimientosContacto
            {
                Id = model.Id,
                IdEstablecimiento = model.IdEstablecimiento,
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
