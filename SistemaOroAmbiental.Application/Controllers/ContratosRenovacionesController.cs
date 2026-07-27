using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ContratosRenovacionesController : Controller
    {
        private readonly IContratosRenovacionesService _service;

        public ContratosRenovacionesController(IContratosRenovacionesService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ListaPorContrato(int idContrato)
        {
            var items = await _service.ObtenerPorContrato(idContrato);

            var lista = items.Select(x => new VMContratoRenovacion
            {
                Id = x.Id,
                IdContrato = x.IdContrato,
                Tipo = x.Tipo,
                FechaInicio = x.FechaInicio,
                FechaVencimiento = x.FechaVencimiento
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMContratoRenovacion? model)
        {
            if (model == null)
                return Ok(new { valor = false, mensaje = "Datos de renovación inválidos.", tipo = "validacion" });

            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = new ContratosRenovacion
            {
                IdContrato = model.IdContrato,
                Tipo = model.Tipo?.Trim() ?? "",
                FechaInicio = NormalizarFecha(model.FechaInicio),
                FechaVencimiento = NormalizarFecha(model.FechaVencimiento),
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            var result = await _service.Insertar(entity);

            return Ok(new
            {
                id = entity.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMContratoRenovacion model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = new ContratosRenovacion
            {
                Id = model.Id,
                IdContrato = model.IdContrato,
                Tipo = model.Tipo?.Trim() ?? "",
                FechaInicio = model.FechaInicio,
                FechaVencimiento = model.FechaVencimiento.Date,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            var result = await _service.Actualizar(entity);

            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var result = await _service.Eliminar(id);
            return Ok(new { valor = result.Ok, mensaje = result.Mensaje, tipo = result.Tipo });
        }

        private static DateTime NormalizarFecha(DateTime fecha)
        {
            if (fecha == default) return default;
            return fecha.Date;
        }
    }
}
