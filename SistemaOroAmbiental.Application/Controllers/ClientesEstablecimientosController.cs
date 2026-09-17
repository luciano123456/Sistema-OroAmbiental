using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Helpers;
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
        private readonly IClientesOperativoService _operativoService;
        private readonly IClientesEstablecimientosContactosService _contactosEstService;
        private readonly IClientesContactosService _contactosCliService;
        private readonly IClientesService _clientesService;

        public ClientesEstablecimientosController(
            IClientesEstablecimientosService service,
            ILocalidadesService localidadesService,
            IPartidosService partidosService,
            IClientesOperativoService operativoService,
            IClientesEstablecimientosContactosService contactosEstService,
            IClientesContactosService contactosCliService,
            IClientesService clientesService)
        {
            _service = service;
            _localidadesService = localidadesService;
            _partidosService = partidosService;
            _operativoService = operativoService;
            _contactosEstService = contactosEstService;
            _contactosCliService = contactosCliService;
            _clientesService = clientesService;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> ListaPorCliente(int idCliente)
        {
            if (idCliente <= 0)
                return Ok(new List<object>());

            var items = await _service.ListarPorCliente(idCliente);

            var lista = items
                .Select(e => new
                {
                    e.Id,
                    e.Nombre,
                    e.IdCliente,
                    Etiqueta = e.Nombre,
                    e.OrdenRecorrido
                })
                .ToList();

            return Ok(lista);
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var items = (await _service.ObtenerTodos()).ToList();
            return Ok(items.Select(MapEstablecimientoVm).ToList());
        }

        [HttpPost]
        public async Task<IActionResult> ListaPaginada([FromBody] GrillaServerRequest req)
        {
            var consulta = GrillaServerHelper.ToConsulta(req);
            var result = await _service.ListarPaginado(consulta);
            var data = result.Items.Select(MapEstablecimientoVm).ToList();
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

        private static VMClienteEstablecimiento MapEstablecimientoVm(ClientesEstablecimiento e) => new()
            {
                Id = e.Id,
                IdCliente = e.IdCliente,
                IdEstablecimientoCliente = e.IdEstablecimientoCliente,
                Nombre = e.Nombre,
                Cuit = e.Cuit,
                IdCondicionIva = e.IdCondicionIva,
                Domicilio = DomicilioHelper.Componer(e.Calle, e.Numero, e.PisoDepartamento, e.Domicilio),
                Calle = e.Calle,
                Descripcion = e.Descripcion,
                Numero = e.Numero,
                PisoDepartamento = e.PisoDepartamento,
                IdTipoGenerador = e.IdTipoGenerador,
                IdActividad = e.IdActividad,
                IdProvincia = e.IdProvincia,
                IdPartido = e.IdPartido,
                IdLocalidad = e.IdLocalidad,
                Localidad = !string.IsNullOrWhiteSpace(e.Localidad)
                    ? e.Localidad
                    : (e.IdLocalidadNavigation?.Nombre ?? ""),
                CodPostal = e.CodPostal,
                ImpuestoIva = e.ImpuestoIva,
                IdEstado = e.IdEstado,
                IdMotivo = e.IdMotivo,
                MotivoDetalle = e.MotivoDetalle,
                IdCalificacion = e.IdCalificacion,
                FechaInicio = e.FechaInicio,
                FechaLicenciaDesde = e.FechaLicenciaDesde,
                FechaLicenciaHasta = e.FechaLicenciaHasta,
                Estado = e.IdEstadoNavigation?.Nombre ?? "",
                Motivo = e.IdMotivoNavigation?.Nombre ?? "",
                Calificacion = e.IdCalificacionNavigation?.Nombre ?? "",
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
                Actividad = e.IdActividadNavigation?.Nombre ?? "",
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
        };

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
                e.Descripcion,
                e.Numero,
                e.PisoDepartamento,
                Domicilio = DomicilioHelper.Componer(e.Calle, e.Numero, e.PisoDepartamento, e.Domicilio),
                e.IdTipoGenerador,
                e.IdActividad,
                e.IdProvincia,
                e.IdPartido,
                e.IdLocalidad,
                e.Localidad,
                Partido = e.IdPartidoNavigation?.Nombre,
                CodigoPartido = e.IdPartidoNavigation?.Codigo,
                CodigoLocalidad = e.IdLocalidadNavigation?.Codigo,
                e.CodPostal,
                e.ImpuestoIva,
                e.IdEstado,
                e.IdMotivo,
                e.MotivoDetalle,
                e.IdCalificacion,
                e.FechaInicio,
                e.FechaLicenciaDesde,
                e.FechaLicenciaHasta,
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

        [HttpGet]
        public async Task<IActionResult> InformeDeuda(int id)
        {
            var e = await _service.Obtener(id);
            if (e == null) return NotFound();

            var cliente = await _clientesService.Obtener(e.IdCliente);
            var contactosEst = await _contactosEstService.ObtenerPorEstablecimiento(id);
            var contactosCli = await _contactosCliService.ObtenerPorCliente(e.IdCliente);

            var anioHoy = DateTime.Now.Year;
            var anios = new[] { anioHoy, anioHoy - 1, anioHoy - 2 };
            var meses = Enumerable.Range(1, 12).ToList();
            var cultura = new System.Globalization.CultureInfo("es-AR");

            var control = await _operativoService.ObtenerControlMensualFiltrado(
                e.IdCliente, anios, meses, new[] { id });

            var filas = (control?.Filas ?? new List<ClienteControlMensualDto>())
                .Where(TieneMovimientoReclamo)
                .OrderBy(f => f.Anio)
                .ThenBy(f => f.Mes)
                .Select(f => MapearMesReclamo(f, cultura))
                .ToList();

            var contactos = new List<VMEstablecimientoReclamoContacto>();

            if (cliente != null &&
                (!string.IsNullOrWhiteSpace(cliente.Telefono)
                 || !string.IsNullOrWhiteSpace(cliente.TelefonoAlt)
                 || !string.IsNullOrWhiteSpace(cliente.Email)))
            {
                contactos.Add(new VMEstablecimientoReclamoContacto
                {
                    Id = 0,
                    Origen = "Cliente",
                    Nombre = cliente.Nombre,
                    Telefono = cliente.Telefono,
                    TelefonoAlt = cliente.TelefonoAlt,
                    Email = cliente.Email
                });
            }

            contactos.AddRange(contactosEst.Select(c => new VMEstablecimientoReclamoContacto
            {
                Id = c.Id,
                Origen = "Establecimiento",
                Nombre = c.Nombre,
                Puesto = c.Puesto,
                Telefono = c.Telefono,
                TelefonoAlt = c.TelefonoAlt,
                Email = c.Email
            }));

            contactos.AddRange(contactosCli.Select(c => new VMEstablecimientoReclamoContacto
            {
                Id = c.Id,
                Origen = "Cliente",
                Nombre = c.Nombre,
                Puesto = c.Puesto,
                Telefono = c.Telefono,
                TelefonoAlt = c.TelefonoAlt,
                Email = c.Email
            }));

            var calle = DomicilioHelper.Componer(e.Calle, e.Numero, e.PisoDepartamento, e.Domicilio);
            if (!string.IsNullOrWhiteSpace(e.Descripcion))
                calle = string.IsNullOrWhiteSpace(calle)
                    ? e.Descripcion.Trim()
                    : $"{calle} ({e.Descripcion.Trim()})";
            var localidad = !string.IsNullOrWhiteSpace(e.Localidad)
                ? e.Localidad.Trim()
                : (e.IdLocalidadNavigation?.Nombre ?? "").Trim();
            var partido = (e.IdPartidoNavigation?.Nombre ?? "").Trim();
            var ubicacion = ArmarUbicacionEstablecimiento(calle, localidad, partido, e.CodPostal);

            return Ok(new VMEstablecimientoReclamoDeuda
            {
                IdEstablecimiento = e.Id,
                IdCliente = e.IdCliente,
                Establecimiento = e.Nombre,
                CodigoEstablecimiento = e.IdEstablecimientoCliente,
                Direccion = string.IsNullOrWhiteSpace(ubicacion) ? calle : ubicacion,
                Localidad = localidad,
                Partido = partido,
                Cliente = cliente?.Nombre ?? e.IdClienteNavigation?.Nombre ?? "",
                SaldoEstablecimiento = filas.LastOrDefault()?.Saldo ?? 0,
                SaldoCliente = control?.TotalSaldo ?? 0,
                Meses = filas,
                Contactos = contactos
            });
        }

        private static string ArmarUbicacionEstablecimiento(
            string? calle, string? localidad, string? partido, string? codPostal)
        {
            var partes = new List<string>();
            if (!string.IsNullOrWhiteSpace(calle)) partes.Add(calle.Trim());
            if (!string.IsNullOrWhiteSpace(localidad)) partes.Add(localidad.Trim());
            if (!string.IsNullOrWhiteSpace(partido) &&
                !string.Equals(partido.Trim(), localidad?.Trim(), StringComparison.OrdinalIgnoreCase))
                partes.Add(partido.Trim());
            if (!string.IsNullOrWhiteSpace(codPostal)) partes.Add("CP " + codPostal.Trim());
            return string.Join(", ", partes);
        }

        private static bool TieneMovimientoReclamo(ClienteControlMensualDto f)
        {
            return f.Debe > 0.009m
                || f.Haber > 0.009m
                || f.TotalIntereses > 0.009m
                || f.AbonoEfectivo > 0.009m
                || f.AbonoTransferencia > 0.009m
                || f.FechaVisita.HasValue
                || Math.Abs(f.RestanteMes) > 0.009m;
        }

        private static VMEstablecimientoReclamoMes MapearMesReclamo(
            ClienteControlMensualDto f,
            System.Globalization.CultureInfo cultura)
        {
            var mesNombre = string.IsNullOrWhiteSpace(f.MesNombre)
                ? new DateTime(f.Anio, f.Mes, 1).ToString("MMMM", cultura)
                : f.MesNombre;
            var periodo = new DateTime(f.Anio, f.Mes, 1)
                .ToString("MMM-yy", cultura)
                .Replace(".", "")
                .Replace(" ", "")
                .ToLowerInvariant();

            var abonoEf = f.AbonoEfectivo;
            var abonoTr = f.AbonoTransferencia;
            if (abonoEf <= 0.009m && abonoTr <= 0.009m && f.Haber > 0.009m)
                abonoTr = f.Haber;

            var estado = f.RestanteMes > 0.009m
                ? "deuda"
                : (f.RestanteMes < -0.009m || f.Haber > f.TotalMes + 0.009m ? "afavor" : "cancelado");

            string? nota = null;
            if (f.Haber > f.TotalMes + 0.009m)
            {
                var excedente = f.Haber - f.TotalMes;
                nota = $"El pago de este mes supera el cargo ({excedente.ToString("C2", cultura)} de más) y se imputó a deuda de períodos anteriores.";
            }
            else if (f.Haber > 0.009m && f.RestanteMes <= 0.009m && f.TotalMes > 0.009m)
            {
                nota = "Mes cancelado. Si el cliente cree que pagó 'este mes', el pago puede haber cubierto también deuda previa.";
            }
            else if (f.Haber > 0.009m && f.RestanteMes > 0.009m)
            {
                nota = "Quedó saldo en este período. El pago no alcanzó a cubrir el cargo + intereses.";
            }

            return new VMEstablecimientoReclamoMes
            {
                Anio = f.Anio,
                Mes = f.Mes,
                MesNombre = mesNombre,
                Periodo = periodo,
                FechaRecoleccion = f.FechaVisita,
                Adeudado = f.Debe,
                Intereses = f.TotalIntereses,
                TotalMes = f.TotalMes,
                AbonoEfectivo = abonoEf,
                AbonoTransferencia = abonoTr,
                FechaTransferencia = f.FechaTransferencia,
                Haber = f.Haber,
                Restante = f.RestanteMes,
                Saldo = f.Saldo,
                Estado = estado,
                NotaImputacion = nota
            };
        }

        [HttpGet]
        public async Task<IActionResult> OcupanteOrdenRecorrido(
            int idCamion, int idDia, int idSemana, int orden, int idExcluir = 0)
        {
            var info = await _service.ObtenerOcupanteOrdenRecorrido(
                idCamion, idDia, idSemana, orden, idExcluir > 0 ? idExcluir : null);
            return Ok(info);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMClienteEstablecimiento model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var geoError = await NormalizarGeo(model);
            if (geoError != null)
                return Ok(new { valor = false, mensaje = geoError, tipo = "validacion" });

            var entity = MapearEntidad(model, idUsuario, esNuevo: true);

            ServiceResult result = await _service.Insertar(entity, model.DesplazarOrdenRecorrido);

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

            ServiceResult result = await _service.Actualizar(entity, model.DesplazarOrdenRecorrido);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo,
                idReferencia = result.IdReferencia
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

        private static ClientesEstablecimiento MapearEntidad(VMClienteEstablecimiento model, int idUsuario, bool esNuevo)
        {
            var calle = string.IsNullOrWhiteSpace(model.Calle) ? null : model.Calle.Trim();
            var descripcion = string.IsNullOrWhiteSpace(model.Descripcion) ? null : model.Descripcion.Trim();
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
                Descripcion = descripcion,
                Numero = numero,
                PisoDepartamento = piso,
                Domicilio = DomicilioHelper.Componer(calle, numero, piso, model.Domicilio),
                IdTipoGenerador = model.IdTipoGenerador,
                IdActividad = model.IdActividad,
                IdProvincia = model.IdProvincia,
                IdPartido = model.IdPartido,
                IdLocalidad = model.IdLocalidad,
                Localidad = string.IsNullOrWhiteSpace(model.Localidad) ? null : model.Localidad.Trim(),
                CodPostal = model.CodPostal,
                ImpuestoIva = model.ImpuestoIva,
                IdEstado = model.IdEstado,
                IdMotivo = model.IdMotivo,
                MotivoDetalle = string.IsNullOrWhiteSpace(model.MotivoDetalle) ? null : model.MotivoDetalle.Trim(),
                IdCalificacion = model.IdCalificacion,
                FechaInicio = model.FechaInicio,
                FechaLicenciaDesde = model.FechaLicenciaDesde,
                FechaLicenciaHasta = model.FechaLicenciaHasta,
                IdDiaRecoleccion = model.IdDiaRecoleccion is > 0 ? model.IdDiaRecoleccion : null,
                IdSemanaRecoleccion = model.IdSemanaRecoleccion is > 0 ? model.IdSemanaRecoleccion : null,
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
            => t == default ? "" : $"{(int)t.TotalHours:D2}:{t.Minutes:D2}";

        private static TimeSpan ParseHora(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return TimeSpan.Zero;

            if (TimeSpan.TryParse(valor, out var ts))
                return ts;

            return TimeSpan.Zero;
        }

        private static TimeSpan ResolverHorarioDesde(VMClienteEstablecimiento model)
            => ParseHora(model.HorarioRecoleccionDesde);

        private static TimeSpan ResolverHorarioHasta(VMClienteEstablecimiento model)
            => ParseHora(model.HorarioRecoleccionHasta);

        private static string? NormalizarIdEstablecimientoCliente(string? valor)
        {
            if (string.IsNullOrWhiteSpace(valor)) return null;
            var txt = valor.Trim();
            return txt.Length > 8 ? txt[..8] : txt;
        }
    }
}
