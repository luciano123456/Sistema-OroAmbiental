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
        private readonly ILocalidadesService _localidadesService;
        private readonly IPartidosService _partidosService;

        public ClientesEstablecimientosController(
            IClientesEstablecimientosService service,
            ILocalidadesService localidadesService,
            IPartidosService partidosService)
        {
            _service = service;
            _localidadesService = localidadesService;
            _partidosService = partidosService;
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
                Etiqueta = e.Nombre,
                e.OrdenRecorrido
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
                IdEstablecimientoCliente = e.IdEstablecimientoCliente,
                Nombre = e.Nombre,
                Cuit = e.Cuit,
                IdCondicionIva = e.IdCondicionIva,
                Domicilio = DomicilioHelper.Componer(e.Calle, e.Numero, e.PisoDepartamento, e.Domicilio),
                Calle = e.Calle,
                Numero = e.Numero,
                PisoDepartamento = e.PisoDepartamento,
                IdTipoGenerador = e.IdTipoGenerador,
                IdProvincia = e.IdProvincia,
                IdPartido = e.IdPartido,
                IdLocalidad = e.IdLocalidad,
                Localidad = !string.IsNullOrWhiteSpace(e.Localidad)
                    ? e.Localidad
                    : (e.IdLocalidadNavigation?.Nombre ?? ""),
                CodPostal = e.CodPostal,
                ImpuestoIva = e.ImpuestoIva,
                IdDiaRecoleccion = e.IdDiaRecoleccion,
                IdSemanaRecoleccion = e.IdSemanaRecoleccion,
                IdListaPrecio = e.IdListaPrecio,
                IdCamion = e.IdCamion,
                OrdenRecorrido = e.OrdenRecorrido,
                Kilos = e.Kilos,
                HorarioRecoleccionDesde = FormatearHora(e.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = FormatearHora(e.HorarioRecoleccionHasta),
                DiasHorarios = e.DiasHorarios,
                Cliente = e.IdClienteNavigation?.Nombre ?? "",
                Provincia = e.IdProvinciaNavigation?.Nombre ?? "",
                Partido = e.IdPartidoNavigation?.Nombre ?? "",
                CodigoPartido = e.IdPartidoNavigation?.Codigo ?? "",
                CodigoLocalidad = e.IdLocalidadNavigation?.Codigo ?? "",
                CondicionIva = e.IdCondicionIvaNavigation?.Nombre ?? "",
                TipoGenerador = e.IdTipoGeneradorNavigation != null
                    ? e.IdTipoGeneradorNavigation.Codigo + " - " + e.IdTipoGeneradorNavigation.Nombre
                    : "",
                DiaRecoleccion = e.IdDiaRecoleccionNavigation?.Nombre ?? "",
                SemanaRecoleccion = e.IdSemanaRecoleccionNavigation?.Nombre ?? "",
                ListaPrecio = e.IdListaPrecioNavigation?.Nombre ?? "",
                Camion = e.IdCamionNavigation?.Nombre ?? "",
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
                e.IdEstablecimientoCliente,
                e.Nombre,
                e.Cuit,
                e.IdCondicionIva,
                e.Calle,
                e.Numero,
                e.PisoDepartamento,
                Domicilio = DomicilioHelper.Componer(e.Calle, e.Numero, e.PisoDepartamento, e.Domicilio),
                e.IdTipoGenerador,
                e.IdProvincia,
                e.IdPartido,
                e.IdLocalidad,
                e.Localidad,
                Partido = e.IdPartidoNavigation?.Nombre,
                CodigoPartido = e.IdPartidoNavigation?.Codigo,
                CodigoLocalidad = e.IdLocalidadNavigation?.Codigo,
                e.CodPostal,
                e.ImpuestoIva,
                e.IdDiaRecoleccion,
                e.IdSemanaRecoleccion,
                e.IdListaPrecio,
                e.IdCamion,
                e.OrdenRecorrido,
                e.Kilos,
                HorarioRecoleccionDesde = FormatearHora(e.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = FormatearHora(e.HorarioRecoleccionHasta),
                DiasHorarios = e.DiasHorarios,
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

            var geoError = await NormalizarGeo(model);
            if (geoError != null)
                return Ok(new { valor = false, mensaje = geoError, tipo = "validacion" });

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

            var geoError = await NormalizarGeo(model);
            if (geoError != null)
                return Ok(new { valor = false, mensaje = geoError, tipo = "validacion" });

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
            var calle = string.IsNullOrWhiteSpace(model.Calle) ? null : model.Calle.Trim();
            var numero = string.IsNullOrWhiteSpace(model.Numero) ? null : model.Numero.Trim();
            var piso = string.IsNullOrWhiteSpace(model.PisoDepartamento) ? null : model.PisoDepartamento.Trim();

            var entity = new ClientesEstablecimiento
            {
                Id = model.Id,
                IdCliente = model.IdCliente,
                IdEstablecimientoCliente = NormalizarIdEstablecimientoCliente(model.IdEstablecimientoCliente),
                Nombre = model.Nombre?.Trim() ?? "",
                Cuit = model.Cuit,
                IdCondicionIva = model.IdCondicionIva,
                Calle = calle,
                Numero = numero,
                PisoDepartamento = piso,
                Domicilio = DomicilioHelper.Componer(calle, numero, piso, model.Domicilio),
                IdTipoGenerador = model.IdTipoGenerador,
                IdProvincia = model.IdProvincia,
                IdPartido = model.IdPartido,
                IdLocalidad = model.IdLocalidad,
                Localidad = string.IsNullOrWhiteSpace(model.Localidad) ? null : model.Localidad.Trim(),
                CodPostal = model.CodPostal,
                ImpuestoIva = model.ImpuestoIva,
                IdDiaRecoleccion = model.IdDiaRecoleccion,
                IdSemanaRecoleccion = model.IdSemanaRecoleccion,
                IdListaPrecio = model.IdListaPrecio is > 0 ? model.IdListaPrecio : null,
                IdCamion = model.IdCamion,
                OrdenRecorrido = model.OrdenRecorrido,
                Kilos = model.Kilos,
                DiasHorarios = string.IsNullOrWhiteSpace(model.DiasHorarios) ? null : model.DiasHorarios.Trim(),
                HorarioRecoleccionDesde = ResolverHorarioDesde(model),
                HorarioRecoleccionHasta = ResolverHorarioHasta(model)
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

        private async Task<string?> NormalizarGeo(VMClienteEstablecimiento model)
        {
            if (model.IdLocalidad.HasValue)
            {
                var localidad = await _localidadesService.Obtener(model.IdLocalidad.Value);
                if (localidad == null)
                    return "La localidad seleccionada no existe.";

                if (model.IdPartido.HasValue && localidad.IdPartido != model.IdPartido)
                    return "La localidad seleccionada no pertenece al partido indicado.";

                if (model.IdProvincia.HasValue && localidad.IdProvincia != model.IdProvincia)
                    return "La localidad seleccionada no pertenece a la provincia indicada.";

                model.IdPartido = localidad.IdPartido;
                model.IdProvincia = localidad.IdProvincia;
                model.Localidad = localidad.Nombre;
            }
            else
            {
                model.Localidad = string.IsNullOrWhiteSpace(model.Localidad)
                    ? null
                    : model.Localidad.Trim();
            }

            if (model.IdPartido.HasValue)
            {
                var partido = await _partidosService.Obtener(model.IdPartido.Value);
                if (partido == null)
                    return "El partido seleccionado no existe.";

                if (model.IdProvincia.HasValue && partido.IdProvincia != model.IdProvincia)
                    return "El partido seleccionado no pertenece a la provincia indicada.";

                model.IdProvincia = partido.IdProvincia;
            }

            return null;
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

        private static TimeSpan ResolverHorarioDesde(VMClienteEstablecimiento model)
        {
            var desde = ParseHora(model.HorarioRecoleccionDesde);
            var hasta = ParseHora(model.HorarioRecoleccionHasta);
            if (hasta > desde) return desde;
            return new TimeSpan(8, 0, 0);
        }

        private static TimeSpan ResolverHorarioHasta(VMClienteEstablecimiento model)
        {
            var desde = ParseHora(model.HorarioRecoleccionDesde);
            var hasta = ParseHora(model.HorarioRecoleccionHasta);
            if (hasta > desde) return hasta;
            return new TimeSpan(18, 0, 0);
        }

        private static string? NormalizarIdEstablecimientoCliente(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return null;
            var txt = valor.Trim();
            return txt.Length > 8 ? txt[..8] : txt;
        }
    }
}
