using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesController : Controller
    {
        private readonly IClientesService _service;
        private readonly IClientesEstablecimientosService _establecimientosService;
        private readonly IClientesEstablecimientosRepository _establecimientosRepo;

        public ClientesController(
            IClientesService service,
            IClientesEstablecimientosService establecimientosService,
            IClientesEstablecimientosRepository establecimientosRepo)
        {
            _service = service;
            _establecimientosService = establecimientosService;
            _establecimientosRepo = establecimientosRepo;
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

        [HttpGet]
        public async Task<IActionResult> RecoleccionPrincipal(int idCliente)
        {
            if (idCliente <= 0)
                return Ok(new VMClienteRecoleccionPrincipal { IdCliente = idCliente });

            var est = await _establecimientosRepo.ObtenerPrincipalPorCliente(idCliente);
            if (est == null)
            {
                return Ok(new VMClienteRecoleccionPrincipal { IdCliente = idCliente });
            }

            var diasAdicionales = await _establecimientosRepo.ObtenerDiasAdicionales(est.Id);
            var diasSemana = ConstruirDiasSemana(est.IdDiaRecoleccion, est.IdCamion, diasAdicionales);

            return Ok(new VMClienteRecoleccionPrincipal
            {
                IdCliente = idCliente,
                IdEstablecimiento = est.Id,
                IdDiaRecoleccion = est.IdDiaRecoleccion,
                IdSemanaRecoleccion = est.IdSemanaRecoleccion,
                IdCamion = est.IdCamion,
                IdListaPrecio = est.IdListaPrecio,
                HorarioRecoleccionDesde = FormatearHoraRec(est.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = FormatearHoraRec(est.HorarioRecoleccionHasta),
                OrdenRecorrido = est.OrdenRecorrido,
                Kilos = est.Kilos,
                IdTipoGenerador = est.IdTipoGenerador,
                DiasSemana = diasSemana,
                DiasAdicionales = diasSemana
                    .Where(d => d.IdDia != est.IdDiaRecoleccion)
                    .ToList()
            });
        }

        [HttpPut]
        public async Task<IActionResult> RecoleccionPrincipal([FromBody] VMClienteRecoleccionPrincipal model)
        {
            if (model.IdCliente <= 0)
                return Ok(new { valor = false, mensaje = "Cliente invalido.", tipo = "validacion" });

            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var cliente = await _service.Obtener(model.IdCliente);
            if (cliente == null)
                return Ok(new { valor = false, mensaje = "Cliente no encontrado.", tipo = "validacion" });

            var est = model.IdEstablecimiento > 0
                ? await _establecimientosService.Obtener(model.IdEstablecimiento)
                : await _establecimientosRepo.ObtenerPrincipalPorCliente(model.IdCliente);

            var esNuevo = est == null;

            if (esNuevo)
            {
                var idDia = model.IdDiaRecoleccion > 0
                    ? model.IdDiaRecoleccion
                    : await _establecimientosRepo.ObtenerPrimerIdCatalogo("Dias");
                var idSemana = model.IdSemanaRecoleccion > 0
                    ? model.IdSemanaRecoleccion
                    : await _establecimientosRepo.ObtenerPrimerIdCatalogo("Semanas");
                var idLista = model.IdListaPrecio > 0
                    ? model.IdListaPrecio
                    : await _establecimientosRepo.ObtenerPrimerIdCatalogo("ListasPrecios");

                if (idDia <= 0 || idSemana <= 0 || idLista <= 0)
                {
                    return Ok(new
                    {
                        valor = false,
                        mensaje = "Configure catalogos de dia, semana y lista de precios.",
                        tipo = "validacion"
                    });
                }

                est = new ClientesEstablecimiento
                {
                    IdCliente = model.IdCliente,
                    Nombre = cliente.Nombre?.Trim() ?? "Principal",
                    Cuit = cliente.Cuit,
                    Calle = cliente.Calle,
                    Numero = cliente.Numero,
                    PisoDepartamento = cliente.PisoDepartamento,
                    Domicilio = DomicilioHelper.Componer(cliente.Calle, cliente.Numero, cliente.PisoDepartamento, cliente.Domicilio),
                    IdCondicionIva = cliente.IdCondicionIva,
                    IdProvincia = cliente.IdProvincia,
                    Localidad = cliente.Localidad,
                    CodPostal = cliente.CodPostal,
                    IdDiaRecoleccion = idDia,
                    IdSemanaRecoleccion = idSemana,
                    IdListaPrecio = idLista,
                    HorarioRecoleccionDesde = ParseHoraRec(model.HorarioRecoleccionDesde),
                    HorarioRecoleccionHasta = ParseHoraRec(model.HorarioRecoleccionHasta),
                    IdUsuarioRegistra = idUsuario,
                    FechaUsuarioRegistra = DateTime.Now
                };
            }

            var diasEntrada = (model.DiasSemana?.Count > 0 ? model.DiasSemana : null)
                ?? ConstruirDiasSemana(model.IdDiaRecoleccion, model.IdCamion, model.DiasAdicionales?
                    .Select(d => new ClientesEstablecimientosDia { IdDia = d.IdDia, IdCamion = d.IdCamion })
                    .ToList() ?? new List<ClientesEstablecimientosDia>());

            var (idDiaPrincipal, idCamionPrincipal, diasExtras) = ResolverDiaPrincipalRecoleccion(
                model.IdDiaRecoleccion,
                diasEntrada);

            est!.IdDiaRecoleccion = idDiaPrincipal > 0 ? idDiaPrincipal : est.IdDiaRecoleccion;
            est.IdSemanaRecoleccion = model.IdSemanaRecoleccion > 0 ? model.IdSemanaRecoleccion : est.IdSemanaRecoleccion;
            est.IdListaPrecio = model.IdListaPrecio > 0 ? model.IdListaPrecio : est.IdListaPrecio;
            est.IdCamion = idCamionPrincipal;

            var horaDesde = ParseHoraRec(model.HorarioRecoleccionDesde);
            var horaHasta = ParseHoraRec(model.HorarioRecoleccionHasta);
            if (horaHasta <= horaDesde)
            {
                horaDesde = new TimeSpan(8, 0, 0);
                horaHasta = new TimeSpan(18, 0, 0);
            }

            est.HorarioRecoleccionDesde = horaDesde;
            est.HorarioRecoleccionHasta = horaHasta;
            est.OrdenRecorrido = model.OrdenRecorrido;
            est.Kilos = model.Kilos;
            est.IdTipoGenerador = model.IdTipoGenerador ?? cliente.IdTipoGenerador;

            ServiceResult result = esNuevo
                ? await _establecimientosService.Insertar(est)
                : await _establecimientosService.Actualizar(est);

            if (!result.Ok)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = result.Mensaje,
                    tipo = result.Tipo,
                    idReferencia = result.IdReferencia
                });
            }

            var idEst = est.Id;
            var diasEnt = diasExtras
                .Select(d => new ClientesEstablecimientosDia
                {
                    IdDia = d.IdDia,
                    IdCamion = d.IdCamion
                })
                .ToList();

            var okDias = await _establecimientosRepo.ReemplazarDiasAdicionales(idEst, diasEnt, idUsuario);
            if (!okDias)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "Se guardo el establecimiento pero no los dias adicionales.",
                    tipo = "error"
                });
            }

            return Ok(new
            {
                valor = true,
                mensaje = esNuevo ? "Establecimiento principal registrado." : "Recoleccion actualizada.",
                idEstablecimiento = idEst
            });
        }

        private static List<VMClienteRecoleccionDiaAdicional> ConstruirDiasSemana(
            int idDiaPrincipal,
            int? idCamionPrincipal,
            IReadOnlyList<ClientesEstablecimientosDia> diasAdicionales)
        {
            var map = new Dictionary<int, int?>();

            if (idDiaPrincipal > 0 && idCamionPrincipal.HasValue && idCamionPrincipal > 0)
                map[idDiaPrincipal] = idCamionPrincipal;

            foreach (var d in diasAdicionales.Where(x => x.IdDia > 0))
            {
                if (d.IdCamion.HasValue && d.IdCamion > 0)
                    map[d.IdDia] = d.IdCamion;
            }

            return map
                .OrderBy(x => x.Key)
                .Select(x => new VMClienteRecoleccionDiaAdicional
                {
                    IdDia = x.Key,
                    IdCamion = x.Value
                })
                .ToList();
        }

        private static List<VMClienteRecoleccionDiaAdicional> ConstruirDiasSemana(
            int idDiaPrincipal,
            int? idCamionPrincipal,
            List<VMClienteRecoleccionDiaAdicional>? diasAdicionales)
        {
            var entidades = (diasAdicionales ?? new List<VMClienteRecoleccionDiaAdicional>())
                .Select(d => new ClientesEstablecimientosDia { IdDia = d.IdDia, IdCamion = d.IdCamion })
                .ToList();

            return ConstruirDiasSemana(idDiaPrincipal, idCamionPrincipal, entidades);
        }

        private static (int IdDiaPrincipal, int? IdCamionPrincipal, List<VMClienteRecoleccionDiaAdicional> DiasExtras)
            ResolverDiaPrincipalRecoleccion(int idDiaLegacy, IReadOnlyList<VMClienteRecoleccionDiaAdicional> diasEntrada)
        {
            var asignados = diasEntrada
                .Where(d => d.IdDia is >= 1 and <= 7 && d.IdCamion.HasValue && d.IdCamion > 0)
                .GroupBy(d => d.IdDia)
                .Select(g => g.Last())
                .OrderBy(d => d.IdDia)
                .ToList();

            if (asignados.Count == 0)
                return (idDiaLegacy, null, new List<VMClienteRecoleccionDiaAdicional>());

            var principal = asignados.FirstOrDefault(d => d.IdDia == idDiaLegacy) ?? asignados[0];
            var extras = asignados
                .Where(d => d.IdDia != principal.IdDia)
                .ToList();

            return (principal.IdDia, principal.IdCamion, extras);
        }

        private static string FormatearHoraRec(TimeSpan t)
            => $"{(int)t.TotalHours:D2}:{t.Minutes:D2}";

        private static TimeSpan ParseHoraRec(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return TimeSpan.Zero;

            if (TimeSpan.TryParse(valor, out var ts))
                return ts;

            return TimeSpan.Zero;
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
