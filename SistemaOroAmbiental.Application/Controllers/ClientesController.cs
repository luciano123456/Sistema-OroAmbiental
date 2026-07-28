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

        [AllowAnonymous]
        public IActionResult Gestion(int? id)
        {
            ViewBag.Id = id ?? 0;
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(bool soloActivos = false)
        {
            var clientes = (await _service.ObtenerTodos(soloActivos)).ToList();
            return Ok(clientes.Select(MapVm).ToList());
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCliente model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var cliente = MapEntidad(model, idUsuario, esNuevo: true);

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
            var cliente = MapEntidad(model, idUsuario, esNuevo: false);

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

            return Ok(MapVm(c));
        }

        private static VMCliente MapVm(Cliente c) => new()
        {
            Id = c.Id,
            Activo = c.Activo,
            IdSucursal = c.IdSucursal,
            Nombre = c.Nombre,
            Telefono = c.Telefono,
            TelefonoAlt = c.TelefonoAlt,
            Cuit = c.Cuit ?? "",
            Domicilio = c.Domicilio,
            Calle = c.Calle,
            Numero = c.Numero,
            PisoDepartamento = c.PisoDepartamento,
            IdTipoGenerador = c.IdTipoGenerador,
            TipoGenerador = c.IdTipoGeneradorNavigation != null
                ? c.IdTipoGeneradorNavigation.Codigo + " - " + c.IdTipoGeneradorNavigation.Nombre
                : null,
            IdProvincia = c.IdProvincia,
            Localidad = c.Localidad,
            CodPostal = c.CodPostal,
            IdCondicionIva = c.IdCondicionIva,
            Email = c.Email,
            IdProfesion = c.IdProfesion,
            IdEstado = c.IdEstado,
            IdMotivo = c.IdMotivo,
            MotivoDetalle = c.MotivoDetalle,
            IdCalificacion = c.IdCalificacion,
            IdLocalidad = c.IdLocalidad,
            IdPartido = c.IdPartido,
            Sucursal = c.IdSucursalNavigation?.Nombre ?? "",
            Provincia = c.IdProvinciaNavigation?.Nombre ?? "",
            CondicionIva = c.IdCondicionIvaNavigation?.Nombre ?? "",
            Profesion = c.IdProfesionNavigation?.Nombre ?? "",
            Estado = c.IdEstadoNavigation?.Nombre,
            Motivo = c.IdMotivoNavigation?.Nombre,
            Calificacion = c.IdCalificacionNavigation?.Nombre,
            Partido = c.IdPartidoNavigation?.Nombre,
            NumeroCliente = c.NumeroCliente,
            FechaInicio = c.FechaInicio,
            FechaLicenciaDesde = c.FechaLicenciaDesde,
            FechaLicenciaHasta = c.FechaLicenciaHasta,
            IdUsuarioRegistra = c.IdUsuarioRegistra,
            FechaUsuarioRegistra = c.FechaUsuarioRegistra,
            UsuarioRegistra = c.IdUsuarioRegistraNavigation?.Usuario ?? "",
            IdUsuarioModifica = c.IdUsuarioModifica,
            FechaUsuarioModifica = c.FechaUsuarioModifica,
            UsuarioModifica = c.IdUsuarioModificaNavigation?.Usuario ?? ""
        };

        private static Cliente MapEntidad(VMCliente model, int idUsuario, bool esNuevo)
        {
            var calle = string.IsNullOrWhiteSpace(model.Calle) ? null : model.Calle.Trim();
            var numero = string.IsNullOrWhiteSpace(model.Numero) ? null : model.Numero.Trim();
            var piso = string.IsNullOrWhiteSpace(model.PisoDepartamento) ? null : model.PisoDepartamento.Trim();

            var entity = new Cliente
            {
                Id = model.Id,
                IdSucursal = model.IdSucursal,
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                TelefonoAlt = model.TelefonoAlt,
                Cuit = model.Cuit,
                Calle = calle,
                Numero = numero,
                PisoDepartamento = piso,
                Domicilio = DomicilioHelper.Componer(calle, numero, piso, model.Domicilio),
                IdTipoGenerador = model.IdTipoGenerador,
                IdProvincia = model.IdProvincia,
                Localidad = model.Localidad,
                CodPostal = model.CodPostal,
                IdCondicionIva = model.IdCondicionIva,
                Email = model.Email,
                IdProfesion = model.IdProfesion,
                Activo = model.Activo,
                IdEstado = model.IdEstado,
                IdMotivo = model.IdMotivo,
                MotivoDetalle = model.MotivoDetalle,
                IdCalificacion = model.IdCalificacion,
                IdLocalidad = model.IdLocalidad,
                IdPartido = model.IdPartido,
                NumeroCliente = model.NumeroCliente,
                FechaInicio = model.FechaInicio,
                FechaLicenciaDesde = model.FechaLicenciaDesde,
                FechaLicenciaHasta = model.FechaLicenciaHasta
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
    }
}
