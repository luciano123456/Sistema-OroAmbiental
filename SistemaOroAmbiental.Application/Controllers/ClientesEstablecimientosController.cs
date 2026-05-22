using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesEstablecimientosController : Controller
    {
        private readonly IClientesEstablecimientosService _service;

        public ClientesEstablecimientosController(IClientesEstablecimientosService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> ListaPorCliente(int idCliente)
        {
            if (idCliente <= 0)
                return Ok(new List<object>());

            var items = (await _service.ObtenerTodos())
                .Where(x => x.IdCliente == idCliente)
                .ToList();

            return Ok(items.Select(e => new
            {
                e.Id,
                e.Nombre,
                e.IdCliente,
                Etiqueta = e.Nombre
            }));
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var items = (await _service.ObtenerTodos()).ToList();

            var lista = items.Select(e => new VMClienteEstablecimiento
            {
                Id = e.Id,
                IdCliente = e.IdCliente,
                Nombre = e.Nombre,
                Cuit = e.Cuit,
                IdCondicionIva = e.IdCondicionIva,
                Domicilio = e.Domicilio,
                IdProvincia = e.IdProvincia,
                Localidad = e.Localidad,
                CodPostal = e.CodPostal,
                ImpuestoIva = e.ImpuestoIva,
                IdDiaRecoleccion = e.IdDiaRecoleccion,
                IdSemanaRecoleccion = e.IdSemanaRecoleccion,
                IdListaPrecio = e.IdListaPrecio,
                HorarioRecoleccionDesde = FormatearHora(e.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = FormatearHora(e.HorarioRecoleccionHasta),
                Cliente = e.IdClienteNavigation?.Nombre ?? "",
                Provincia = e.IdProvinciaNavigation?.Nombre ?? "",
                CondicionIva = e.IdCondicionIvaNavigation?.Nombre ?? "",
                DiaRecoleccion = e.IdDiaRecoleccionNavigation?.Nombre ?? "",
                SemanaRecoleccion = e.IdSemanaRecoleccionNavigation?.Nombre ?? "",
                ListaPrecio = e.IdListaPrecioNavigation?.Nombre ?? "",
                IdUsuarioRegistra = e.IdUsuarioRegistra,
                FechaUsuarioRegistra = e.FechaUsuarioRegistra,
                UsuarioRegistra = e.IdUsuarioRegistraNavigation?.Usuario ?? "",
                IdUsuarioModifica = e.IdUsuarioModifica,
                FechaUsuarioModifica = e.FechaUsuarioModifica,
                UsuarioModifica = e.IdUsuarioModificaNavigation?.Usuario ?? ""
            }).ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var e = await _service.Obtener(id);
            if (e == null) return NotFound();

            return Ok(new
            {
                e.Id,
                e.IdCliente,
                e.Nombre,
                e.Cuit,
                e.IdCondicionIva,
                e.Domicilio,
                e.IdProvincia,
                e.Localidad,
                e.CodPostal,
                e.ImpuestoIva,
                e.IdDiaRecoleccion,
                e.IdSemanaRecoleccion,
                e.IdListaPrecio,
                HorarioRecoleccionDesde = FormatearHora(e.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = FormatearHora(e.HorarioRecoleccionHasta),
                e.FechaUsuarioRegistra,
                UsuarioRegistra = e.IdUsuarioRegistraNavigation?.Usuario,
                e.FechaUsuarioModifica,
                UsuarioModifica = e.IdUsuarioModificaNavigation?.Usuario
            });
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEstablecimiento model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = MapearEntidad(model, idUsuario, esNuevo: true);

            ServiceResult result = await _service.Insertar(entity);

            return Ok(new
            {
                id = entity.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMClienteEstablecimiento model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = MapearEntidad(model, idUsuario, esNuevo: false);

            ServiceResult result = await _service.Actualizar(entity);

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
            ServiceResult result = await _service.Eliminar(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        private static ClientesEstablecimiento MapearEntidad(VMClienteEstablecimiento model, int idUsuario, bool esNuevo)
        {
            var entity = new ClientesEstablecimiento
            {
                Id = model.Id,
                IdCliente = model.IdCliente,
                Nombre = model.Nombre?.Trim() ?? "",
                Cuit = model.Cuit,
                IdCondicionIva = model.IdCondicionIva,
                Domicilio = model.Domicilio,
                IdProvincia = model.IdProvincia,
                Localidad = model.Localidad,
                CodPostal = model.CodPostal,
                ImpuestoIva = model.ImpuestoIva,
                IdDiaRecoleccion = model.IdDiaRecoleccion,
                IdSemanaRecoleccion = model.IdSemanaRecoleccion,
                IdListaPrecio = model.IdListaPrecio,
                HorarioRecoleccionDesde = ParseHora(model.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = ParseHora(model.HorarioRecoleccionHasta)
            };

            if (esNuevo)
            {
                entity.IdUsuarioRegistra = idUsuario;
                entity.FechaUsuarioRegistra = DateTime.Now;
            }
            else
            {
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = DateTime.Now;
            }

            return entity;
        }

        private static string FormatearHora(TimeSpan t)
            => $"{(int)t.TotalHours:D2}:{t.Minutes:D2}";

        private static TimeSpan ParseHora(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return TimeSpan.Zero;

            if (TimeSpan.TryParse(valor, out var ts))
                return ts;

            return TimeSpan.Zero;
        }
    }
}
