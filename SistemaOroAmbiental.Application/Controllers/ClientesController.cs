using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Helpers;
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
        private readonly IRecorridosService _recorridosService;
        private readonly IClientesCertificadosTratamientoRepository _certRepo;
        private readonly CertificadosTratamientoStorage _certStorage;
        private readonly IWebHostEnvironment _env;

        public ClientesController(
            IClientesService service,
            IClientesEstablecimientosService establecimientosService,
            IClientesEstablecimientosRepository establecimientosRepo,
            IRecorridosService recorridosService,
            IClientesCertificadosTratamientoRepository certRepo,
            CertificadosTratamientoStorage certStorage,
            IWebHostEnvironment env)
        {
            _service = service;
            _establecimientosService = establecimientosService;
            _establecimientosRepo = establecimientosRepo;
            _recorridosService = recorridosService;
            _certRepo = certRepo;
            _certStorage = certStorage;
            _env = env;
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
        public async Task<IActionResult> ListaPaginada([FromBody] GrillaServerRequest req)
        {
            var consulta = GrillaServerHelper.ToConsulta(req);
            var result = await _service.ListarPaginado(consulta);
            var ids = result.Items.Select(c => c.Id).ToList();
            var textosRecorrido = await _service.ObtenerTextosRecorrido(ids);
            var data = result.Items.Select(c =>
            {
                var vm = MapVm(c);
                if (textosRecorrido.TryGetValue(c.Id, out var texto) && !string.IsNullOrWhiteSpace(texto))
                {
                    vm.Recorrido = "Si";
                    vm.Recorridos = texto;
                }
                return vm;
            }).ToList();
            return Ok(GrillaServerHelper.Respuesta(req, result.Total, result.Filtered, data));
        }

        [HttpPost]
        public async Task<IActionResult> PaginaDeId([FromBody] GrillaServerRequest req, int id)
        {
            if (id <= 0)
                return NotFound();

            var consulta = GrillaServerHelper.ToConsulta(req);
            var indice = await _service.ObtenerIndiceEnLista(id, consulta);
            if (indice < 0)
                return NotFound();

            var pageSize = Math.Clamp(consulta.Length, 1, 200);
            return Ok(new GrillaPaginaDeIdResponse
            {
                Page = GrillaServerHelper.CalcularPagina(indice, pageSize),
                Start = GrillaServerHelper.CalcularPagina(indice, pageSize) * pageSize
            });
        }

        [HttpGet]
        public async Task<IActionResult> Combo(string? q, int take = 40, int? id = null, bool incluirInactivos = false)
        {
            take = Math.Clamp(take, 1, 80);
            var query = await _service.ObtenerTodos(!incluirInactivos);
            var (campo, termino) = ParseComboBusqueda(q);

            if (!string.IsNullOrEmpty(campo) && string.IsNullOrEmpty(termino))
            {
                query = query.Where(c => false);
            }
            else if (!string.IsNullOrEmpty(termino))
            {
                query = FiltrarComboClientes(query, campo, termino);
            }

            var crudos = await query
                .OrderBy(c => c.Nombre)
                .Take(take)
                .Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    c.Cuit,
                    c.NumeroCliente,
                    c.Activo,
                    c.Domicilio,
                    c.Calle,
                    c.Telefono,
                    c.Email,
                    c.MotivoDetalle,
                    Ests = c.ClientesEstablecimientos.Select(e => new
                    {
                        e.Nombre,
                        e.Domicilio,
                        e.Calle,
                        e.Localidad,
                        e.Cuit,
                        e.Descripcion,
                        e.IdEstablecimientoCliente
                    }),
                    Contactos = c.ClientesContactos.Select(x => new
                    {
                        x.Nombre,
                        x.Telefono,
                        x.Email
                    }),
                    Obs = c.ClientesControlMensuales
                        .Where(m => m.Observaciones != null && m.Observaciones != "")
                        .OrderByDescending(m => m.Anio)
                        .ThenByDescending(m => m.Mes)
                        .Select(m => m.Observaciones!)
                        .Take(4)
                })
                .ToListAsync();

            var list = crudos.Select(c =>
            {
                var (matchCampo, matchDetalle) = ResolverMatchCombo(
                    campo,
                    termino,
                    c.Nombre,
                    c.Cuit,
                    c.NumeroCliente,
                    c.Domicilio,
                    c.Calle,
                    c.Telefono,
                    c.Email,
                    c.MotivoDetalle,
                    c.Ests.Select(e => (e.Nombre, e.Domicilio, e.Calle, e.Localidad, e.Cuit, e.Descripcion, e.IdEstablecimientoCliente)),
                    c.Contactos.Select(x => (x.Nombre, x.Telefono, x.Email)),
                    c.Obs);
                return new
                {
                    c.Id,
                    c.Nombre,
                    c.Cuit,
                    c.NumeroCliente,
                    c.Activo,
                    MatchCampo = matchCampo,
                    MatchDetalle = matchDetalle
                };
            }).ToList();

            if (id is > 0 && list.All(x => x.Id != id.Value))
            {
                var extra = await (await _service.ObtenerTodos(false))
                    .Where(c => c.Id == id.Value)
                    .Select(c => new
                    {
                        c.Id,
                        c.Nombre,
                        c.Cuit,
                        c.NumeroCliente,
                        c.Activo,
                        MatchCampo = (string?)null,
                        MatchDetalle = (string?)null
                    })
                    .FirstOrDefaultAsync();
                if (extra != null)
                    list.Insert(0, extra);
            }

            return Ok(list);
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
            var diasSemana = ConstruirDiasSemana(est.IdDiaRecoleccion ?? 0, est.IdCamion, diasAdicionales);

            return Ok(new VMClienteRecoleccionPrincipal
            {
                IdCliente = idCliente,
                IdEstablecimiento = est.Id,
                IdEstablecimientoCliente = est.IdEstablecimientoCliente,
                IdDiaRecoleccion = est.IdDiaRecoleccion ?? 0,
                IdSemanaRecoleccion = est.IdSemanaRecoleccion ?? 0,
                IdCamion = est.IdCamion,
                IdListaPrecio = est.IdListaPrecio,
                HorarioRecoleccionDesde = FormatearHoraRec(est.HorarioRecoleccionDesde),
                HorarioRecoleccionHasta = FormatearHoraRec(est.HorarioRecoleccionHasta),
                DiasHorarios = est.DiasHorarios,
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

                if (idDia <= 0 || idSemana <= 0)
                {
                    return Ok(new
                    {
                        valor = false,
                        mensaje = "Configure catalogos de dia y semana.",
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
                    IdLocalidad = cliente.IdLocalidad,
                    Localidad = cliente.IdLocalidadNavigation?.Nombre,
                    CodPostal = cliente.CodPostal,
                    IdDiaRecoleccion = idDia,
                    IdSemanaRecoleccion = idSemana,
                    IdListaPrecio = null,
                    HorarioRecoleccionDesde = TimeSpan.Zero,
                    HorarioRecoleccionHasta = TimeSpan.Zero,
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
            est.DiasHorarios = string.IsNullOrWhiteSpace(model.DiasHorarios) ? null : model.DiasHorarios.Trim();
            est.IdEstablecimientoCliente = NormalizarIdEstablecimientoClienteRec(model.IdEstablecimientoCliente);
            est.HorarioRecoleccionDesde = ParseHoraRec(model.HorarioRecoleccionDesde);
            est.HorarioRecoleccionHasta = ParseHoraRec(model.HorarioRecoleccionHasta);

            est.OrdenRecorrido = model.OrdenRecorrido is > 0 ? model.OrdenRecorrido : null;
            est.Kilos = model.Kilos;
            est.IdTipoGenerador = model.IdTipoGenerador ?? cliente.IdTipoGenerador;

            if (model.DesplazarOrdenRecorrido && est.OrdenRecorrido is > 0)
            {
                var idExcluir = esNuevo ? (int?)null : est.Id;
                var semana = est.IdSemanaRecoleccion;
                var orden = est.OrdenRecorrido.Value;
                var slots = new HashSet<(int Camion, int Dia)>();
                if (est.IdCamion is > 0 && est.IdDiaRecoleccion is > 0)
                    slots.Add((est.IdCamion.Value, est.IdDiaRecoleccion.Value));
                foreach (var d in diasEntrada)
                {
                    if (d.IdCamion is > 0 && d.IdDia > 0)
                        slots.Add((d.IdCamion.Value, d.IdDia));
                }

                if (semana is > 0)
                {
                    foreach (var (camion, dia) in slots)
                        await _establecimientosRepo.DesplazarOrdenRecorridoSiOcupado(camion, dia, semana.Value, orden, idExcluir);
                }
            }

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

            var sync = await _recorridosService.SyncEstablecimientoEnRecorridos(idEst, idUsuario);
            var mensaje = esNuevo ? "Establecimiento principal registrado." : "Recoleccion actualizada.";
            if (!sync.Ok)
                mensaje += " Atención: no se pudo sincronizar el recorrido (" + sync.Mensaje + ").";

            return Ok(new
            {
                valor = true,
                mensaje,
                idEstablecimiento = idEst,
                syncOk = sync.Ok
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
            => t == default ? "" : $"{(int)t.TotalHours:D2}:{t.Minutes:D2}";

        private static string? NormalizarIdEstablecimientoClienteRec(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return null;
            var txt = valor.Trim();
            return txt.Length > 8 ? txt[..8] : txt;
        }

        private static TimeSpan ParseHoraRec(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return TimeSpan.Zero;

            if (TimeSpan.TryParse(valor, out var ts))
                return ts;

            return TimeSpan.Zero;
        }

        private static VMCliente MapVm(Cliente c)
        {
            var vm = new VMCliente
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
                IdLocalidad = c.IdLocalidad,
                CodPostal = c.CodPostal,
                IdCondicionIva = c.IdCondicionIva,
                Email = c.Email,
                IdProfesion = c.IdProfesion,
                IdEstado = c.IdEstado,
                IdMotivo = c.IdMotivo,
                MotivoDetalle = c.MotivoDetalle,
                IdCalificacion = c.IdCalificacion,
                Sucursal = c.IdSucursalNavigation?.Nombre ?? "",
                Provincia = c.IdProvinciaNavigation?.Nombre ?? "",
                Localidad = c.IdLocalidadNavigation?.Nombre ?? "",
                CondicionIva = c.IdCondicionIvaNavigation?.Nombre ?? "",
                Profesion = c.IdProfesionNavigation?.Nombre ?? "",
                Estado = c.IdEstadoNavigation?.Nombre,
                Motivo = c.IdMotivoNavigation?.Nombre,
                Calificacion = c.IdCalificacionNavigation?.Nombre,
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

            CompletarLicenciaDesdeEstablecimientos(c, vm);
            return vm;
        }

        private static void CompletarLicenciaDesdeEstablecimientos(Cliente c, VMCliente vm)
        {
            var src = LicenciaPeriodo.EstablecimientoLicenciaDisplay(c, DateTime.Today);
            if (src == null) return;

            vm.FechaLicenciaDesde = src.FechaLicenciaDesde ?? vm.FechaLicenciaDesde;
            vm.FechaLicenciaHasta = src.FechaLicenciaHasta ?? vm.FechaLicenciaHasta;
            if (!string.IsNullOrWhiteSpace(src.IdEstadoNavigation?.Nombre))
                vm.Estado = src.IdEstadoNavigation.Nombre;
        }

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
                IdLocalidad = model.IdLocalidad,
                CodPostal = model.CodPostal,
                IdCondicionIva = model.IdCondicionIva,
                Email = model.Email,
                IdProfesion = model.IdProfesion,
                Activo = model.Activo,
                IdEstado = model.IdEstado,
                IdMotivo = model.IdMotivo,
                MotivoDetalle = model.MotivoDetalle,
                IdCalificacion = model.IdCalificacion,
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

        [HttpGet]
        public async Task<IActionResult> ManifiestosDocumentos(int idCliente, int? idEstablecimiento = null)
        {
            if (idCliente <= 0)
                return BadRequest();

            var data = await _certRepo.ListarDocumentosPorCliente(idCliente, idEstablecimiento);
            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> DescargarCertificado(int id)
        {
            if (id <= 0)
                return NotFound();

            var row = await _certRepo.Obtener(id);
            if (row == null)
                return NotFound();

            var abs = _certStorage.AbsPath(row.RutaPdf);
            if (!System.IO.File.Exists(abs))
                return NotFound();

            var bytes = await System.IO.File.ReadAllBytesAsync(abs);
            return File(bytes, "application/pdf", row.NombreArchivo);
        }

        [HttpGet]
        public async Task<IActionResult> DescargarManifiestoHistorial(int idCamion, int id)
        {
            if (idCamion <= 0 || id <= 0)
                return NotFound();

            var model = await _recorridosService.ObtenerManifiestosHistorial(idCamion, new[] { id });
            if (model == null)
                return NotFound();

            try
            {
                var header = Path.Combine(_env.WebRootPath, "Imagenes", "manifiesto-header.jpg");
                var bytes = ManifiestoPdfGenerator.Generar(model, header);
                return File(bytes, "application/pdf", ManifiestoPdfGenerator.NombreArchivo(model));
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("[Manifiesto PDF] " + ex);
                return StatusCode(500, "No se pudo generar el PDF del manifiesto.");
            }
        }

        [HttpGet]
        public async Task<IActionResult> SiguienteNumeroCertificado()
        {
            var data = await _certRepo.ObtenerSiguienteNumero(0, 0);
            return Ok(data);
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarCertificado(int id)
        {
            if (id <= 0)
                return Ok(new { valor = false, mensaje = "Certificado inválido.", tipo = "validacion" });

            var row = await _certRepo.Obtener(id);
            if (row == null)
                return Ok(new { valor = false, mensaje = "No se encontró el certificado.", tipo = "validacion" });

            var abs = _certStorage.AbsPath(row.RutaPdf);
            if (System.IO.File.Exists(abs))
            {
                try { System.IO.File.Delete(abs); } catch { /* ignore */ }
            }

            var ok = await _certRepo.Eliminar(id);
            return Ok(new
            {
                valor = ok,
                mensaje = ok ? "Certificado eliminado." : "No se pudo eliminar el certificado.",
                tipo = ok ? "ok" : "error"
            });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarManifiestoHistorial(int idCamion, int id)
        {
            if (idCamion <= 0 || id <= 0)
                return Ok(new { valor = false, mensaje = "Manifiesto inválido.", tipo = "validacion" });

            var result = await _recorridosService.EliminarManifiestoHistorial(idCamion, id);
            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        private static (string campo, string termino) ParseComboBusqueda(string? q)
        {
            var raw = (q ?? "").Trim();
            if (raw.Length == 0) return ("", "");
            if (raw.StartsWith("#")) return ("nro", raw[1..].Trim());

            foreach (var (keys, campo) in ComboPrefijos)
            {
                foreach (var key in keys)
                {
                    if (raw.StartsWith(key + ":", StringComparison.OrdinalIgnoreCase))
                        return (campo, raw[(key.Length + 1)..].Trim());
                    if (raw.StartsWith(key + " ", StringComparison.OrdinalIgnoreCase))
                        return (campo, raw[(key.Length + 1)..].Trim());
                }
            }

            return ("todos", raw);
        }

        private static readonly (string[] keys, string campo)[] ComboPrefijos =
        {
            (new[] { "establecimiento", "est", "sucursal", "suc" }, "est"),
            (new[] { "domicilio", "direccion", "dir", "dom" }, "dir"),
            (new[] { "observaciones", "observacion", "obs" }, "obs"),
            (new[] { "telefono", "tel", "cel", "email", "mail" }, "tel"),
            (new[] { "numero", "nro", "n" }, "nro"),
            (new[] { "cliente", "nombre", "cli" }, "nombre"),
            (new[] { "cuit", "dni", "cuil" }, "cuit")
        };

        private static IQueryable<Cliente> FiltrarComboClientes(IQueryable<Cliente> query, string campo, string term)
        {
            var digits = new string(term.Where(char.IsDigit).ToArray());
            int.TryParse(term, out var nro);
            var hayNro = nro > 0 && digits == term;

            return campo switch
            {
                "cuit" => query.Where(c =>
                    (c.Cuit != null && (c.Cuit.Contains(term) || (digits.Length > 0 && c.Cuit.Replace("-", "").Replace(" ", "").Replace("/", "").Contains(digits)))) ||
                    c.ClientesEstablecimientos.Any(e =>
                        e.Cuit != null && (e.Cuit.Contains(term) || (digits.Length > 0 && e.Cuit.Replace("-", "").Replace(" ", "").Replace("/", "").Contains(digits))))),
                "nro" => query.Where(c =>
                    (hayNro && (c.NumeroCliente == nro || c.Id == nro)) ||
                    c.Nombre.Contains(term) ||
                    (c.NumeroCliente != null && c.NumeroCliente.ToString()!.Contains(term))),
                "nombre" => query.Where(c =>
                    c.Nombre.Contains(term) ||
                    (hayNro && (c.NumeroCliente == nro || c.Id == nro))),
                "est" => query.Where(c => c.ClientesEstablecimientos.Any(e =>
                    e.Nombre.Contains(term) ||
                    (e.IdEstablecimientoCliente != null && e.IdEstablecimientoCliente.Contains(term)) ||
                    (e.Domicilio != null && e.Domicilio.Contains(term)) ||
                    (e.Calle != null && e.Calle.Contains(term)) ||
                    (e.Localidad != null && e.Localidad.Contains(term)) ||
                    (e.Cuit != null && e.Cuit.Contains(term)) ||
                    (e.Descripcion != null && e.Descripcion.Contains(term)))),
                "dir" => query.Where(c =>
                    (c.Domicilio != null && c.Domicilio.Contains(term)) ||
                    (c.Calle != null && c.Calle.Contains(term)) ||
                    (c.Numero != null && c.Numero.Contains(term)) ||
                    c.ClientesEstablecimientos.Any(e =>
                        (e.Domicilio != null && e.Domicilio.Contains(term)) ||
                        (e.Calle != null && e.Calle.Contains(term)) ||
                        (e.Numero != null && e.Numero.Contains(term)) ||
                        (e.Localidad != null && e.Localidad.Contains(term)))),
                "obs" => query.Where(c =>
                    (c.MotivoDetalle != null && c.MotivoDetalle.Contains(term)) ||
                    c.ClientesControlMensuales.Any(m => m.Observaciones != null && m.Observaciones.Contains(term)) ||
                    c.ClientesRecorridos.Any(r => r.Observacion != null && r.Observacion.Contains(term)) ||
                    c.ClientesEstablecimientos.Any(e => e.Descripcion != null && e.Descripcion.Contains(term))),
                "tel" => query.Where(c =>
                    (c.Telefono != null && c.Telefono.Contains(term)) ||
                    (c.TelefonoAlt != null && c.TelefonoAlt.Contains(term)) ||
                    (c.Email != null && c.Email.Contains(term)) ||
                    c.ClientesContactos.Any(x =>
                        x.Nombre.Contains(term) ||
                        (x.Telefono != null && x.Telefono.Contains(term)) ||
                        (x.TelefonoAlt != null && x.TelefonoAlt.Contains(term)) ||
                        (x.Email != null && x.Email.Contains(term)))),
                _ => query.Where(c =>
                    c.Nombre.Contains(term) ||
                    (hayNro && (c.NumeroCliente == nro || c.Id == nro)) ||
                    (c.Cuit != null && (c.Cuit.Contains(term) || (digits.Length > 0 && c.Cuit.Replace("-", "").Replace(" ", "").Replace("/", "").Contains(digits)))) ||
                    (c.Domicilio != null && c.Domicilio.Contains(term)) ||
                    (c.Calle != null && c.Calle.Contains(term)) ||
                    (c.Telefono != null && c.Telefono.Contains(term)) ||
                    (c.TelefonoAlt != null && c.TelefonoAlt.Contains(term)) ||
                    (c.Email != null && c.Email.Contains(term)) ||
                    (c.MotivoDetalle != null && c.MotivoDetalle.Contains(term)) ||
                    c.ClientesEstablecimientos.Any(e =>
                        e.Nombre.Contains(term) ||
                        (e.IdEstablecimientoCliente != null && e.IdEstablecimientoCliente.Contains(term)) ||
                        (e.Domicilio != null && e.Domicilio.Contains(term)) ||
                        (e.Calle != null && e.Calle.Contains(term)) ||
                        (e.Localidad != null && e.Localidad.Contains(term)) ||
                        (e.Cuit != null && e.Cuit.Contains(term)) ||
                        (e.Descripcion != null && e.Descripcion.Contains(term))) ||
                    c.ClientesContactos.Any(x =>
                        x.Nombre.Contains(term) ||
                        (x.Telefono != null && x.Telefono.Contains(term)) ||
                        (x.Email != null && x.Email.Contains(term))) ||
                    c.ClientesControlMensuales.Any(m => m.Observaciones != null && m.Observaciones.Contains(term)))
            };
        }

        private static (string? campo, string? detalle) ResolverMatchCombo(
            string campo,
            string term,
            string? nombre,
            string? cuit,
            int? numeroCliente,
            string? domicilio,
            string? calle,
            string? telefono,
            string? email,
            string? motivo,
            IEnumerable<(string Nombre, string? Domicilio, string? Calle, string? Localidad, string? Cuit, string? Descripcion, string? Codigo)> ests,
            IEnumerable<(string Nombre, string? Telefono, string? Email)> contactos,
            IEnumerable<string> obs)
        {
            if (string.IsNullOrEmpty(term)) return (null, null);

            bool Hit(string? hay) =>
                !string.IsNullOrEmpty(hay) && hay.Contains(term, StringComparison.OrdinalIgnoreCase);

            var digits = new string(term.Where(char.IsDigit).ToArray());
            bool HitCuit(string? val)
            {
                if (string.IsNullOrEmpty(val)) return false;
                if (val.Contains(term, StringComparison.OrdinalIgnoreCase)) return true;
                if (digits.Length == 0) return false;
                var norm = new string(val.Where(char.IsDigit).ToArray());
                return norm.Contains(digits);
            }

            foreach (var e in ests)
            {
                if (Hit(e.Nombre) || Hit(e.Codigo) || Hit(e.Descripcion) || HitCuit(e.Cuit))
                    return ("Establecimiento", e.Nombre);
                if (Hit(e.Domicilio) || Hit(e.Calle) || Hit(e.Localidad))
                    return ("Domicilio est.", string.Join(" · ", new[] { e.Nombre, e.Domicilio ?? e.Calle, e.Localidad }.Where(x => !string.IsNullOrWhiteSpace(x))));
            }

            if (HitCuit(cuit)) return ("CUIT / DNI", cuit);
            if (Hit(domicilio) || Hit(calle)) return ("Domicilio", domicilio ?? calle);
            if (Hit(telefono) || Hit(email)) return ("Tel / mail", telefono ?? email);
            if (Hit(motivo)) return ("Observación", TruncarCombo(motivo, 80));

            foreach (var o in obs)
            {
                if (Hit(o)) return ("Observación", TruncarCombo(o, 80));
            }

            foreach (var x in contactos)
            {
                if (Hit(x.Nombre) || Hit(x.Telefono) || Hit(x.Email))
                    return ("Contacto", x.Nombre);
            }

            if (numeroCliente != null && numeroCliente.ToString() == term) return ("N° cliente", "#" + numeroCliente);
            if (Hit(nombre) || campo is "nombre" or "todos" or "nro" or "") return (null, null);
            return (null, null);
        }

        private static string TruncarCombo(string? texto, int max)
        {
            var t = (texto ?? "").Trim();
            if (t.Length <= max) return t;
            return t[..max].TrimEnd() + "…";
        }
    }
}
