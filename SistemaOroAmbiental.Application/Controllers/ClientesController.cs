using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesController : Controller
    {
        private readonly IClientesService _service;

        public ClientesController(IClientesService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(bool soloActivos = false)
        {
            var clientes = (await _service.ObtenerTodos(soloActivos)).ToList();

            var lista = clientes.Select(c => new VMCliente
            {
                Id = c.Id,
                Activo = c.Activo,
                IdSucursal = c.IdSucursal,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                TelefonoAlt = c.TelefonoAlt,
                Cuit = c.Cuit,
                Domicilio = c.Domicilio,
                IdProvincia = c.IdProvincia,
                Localidad = c.Localidad,
                CodPostal = c.CodPostal,
                IdCondicionIva = c.IdCondicionIva,
                Email = c.Email,
                IdProfesion = c.IdProfesion,
                Sucursal = c.IdSucursalNavigation != null ? c.IdSucursalNavigation.Nombre : "",
                Provincia = c.IdProvinciaNavigation != null ? c.IdProvinciaNavigation.Nombre : "",
                CondicionIva = c.IdCondicionIvaNavigation != null ? c.IdCondicionIvaNavigation.Nombre : "",
                Profesion = c.IdProfesionNavigation != null ? c.IdProfesionNavigation.Nombre : "",
                IdUsuarioRegistra = c.IdUsuarioRegistra,
                FechaUsuarioRegistra = c.FechaUsuarioRegistra,
                UsuarioRegistra = c.IdUsuarioRegistraNavigation != null ? c.IdUsuarioRegistraNavigation.Usuario : "",
                IdUsuarioModifica = c.IdUsuarioModifica,
                FechaUsuarioModifica = c.FechaUsuarioModifica,
                UsuarioModifica = c.IdUsuarioModificaNavigation != null ? c.IdUsuarioModificaNavigation.Usuario : ""
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCliente model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var cliente = new Cliente
            {
                IdSucursal = model.IdSucursal,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                TelefonoAlt = model.TelefonoAlt,
                Cuit = model.Cuit,
                Domicilio = model.Domicilio,
                IdProvincia = model.IdProvincia,
                Localidad = model.Localidad,
                CodPostal = model.CodPostal,
                IdCondicionIva = model.IdCondicionIva,
                Email = model.Email,
                IdProfesion = model.IdProfesion,
                Activo = model.Activo,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            ServiceResult result = await _service.Insertar(cliente);

            return Ok(new
            {
                id = cliente.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCliente model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var cliente = new Cliente
            {
                Id = model.Id,
                IdSucursal = model.IdSucursal,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                TelefonoAlt = model.TelefonoAlt,
                Cuit = model.Cuit,
                Domicilio = model.Domicilio,
                IdProvincia = model.IdProvincia,
                Localidad = model.Localidad,
                CodPostal = model.CodPostal,
                IdCondicionIva = model.IdCondicionIva,
                Email = model.Email,
                IdProfesion = model.IdProfesion,
                Activo = model.Activo,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            ServiceResult result = await _service.Actualizar(cliente);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
            });
        }

        [HttpPost]
        public async Task<IActionResult> CambiarActivo([FromBody] VMActivoToggle model)
        {
            var result = await _service.CambiarActivo(model.Id, model.Activo);
            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _service.ObtenerDependenciasEliminar(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            ServiceResult result = await _service.Eliminar(id, cascada);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia,
                dependencias = result.Dependencias?.Items,
                instruccionesPasoAPaso = result.InstruccionesPasoAPaso
            });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var c = await _service.Obtener(id);

            if (c == null)
                return NotFound();

            return Ok(new
            {
                c.Id,
                c.IdSucursal,
                c.Nombre,
                c.Telefono,
                c.TelefonoAlt,
                c.Cuit,
                c.Domicilio,
                c.IdProvincia,
                c.Localidad,
                c.CodPostal,
                c.IdCondicionIva,
                c.Email,
                c.IdProfesion,
                c.Activo,
                c.FechaUsuarioRegistra,
                UsuarioRegistra = c.IdUsuarioRegistraNavigation?.Usuario,
                c.FechaUsuarioModifica,
                UsuarioModifica = c.IdUsuarioModificaNavigation?.Usuario
            });
        }
    }
}
