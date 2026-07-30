using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class RecorridosController : Controller
    {
        private readonly IRecorridosService _service;
        private readonly ICamionesService _camionesService;

        public RecorridosController(IRecorridosService service, ICamionesService camionesService)
        {
            _service = service;
            _camionesService = camionesService;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Camiones(bool soloActivos = true)
        {
            var camiones = (await _camionesService.ObtenerTodos(soloActivos)).ToList();

            return Ok(camiones.Select(c => new
            {
                c.Id,
                c.Nombre,
                c.Activo
            }));
        }

        [HttpGet]
        public async Task<IActionResult> Matriz(int? idCamion)
        {
            var data = await _service.ObtenerMatriz(idCamion);
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> GuardarCeldaMatriz([FromBody] VMRecorridosMatrizCelda model)
        {
            if (model == null)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "Datos de la zona incompletos.",
                    tipo = "validacion"
                });
            }

            var idClaim = User.FindFirst("Id")?.Value;
            if (!int.TryParse(idClaim, out int idUsuario) || idUsuario <= 0)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "Sesión expirada. Volvé a iniciar sesión e intentá de nuevo.",
                    tipo = "auth"
                });
            }

            var entity = new RecorridosMatriz
            {
                IdCamion = model.IdCamion,
                IdSemana = model.IdSemana,
                IdDia = model.IdDia,
                Zona = model.Zona?.Trim() ?? "",
                HorarioSalida = string.IsNullOrWhiteSpace(model.HorarioSalida) ? null : model.HorarioSalida.Trim(),
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now,
                IdUsuarioModifica = idUsuario,
                FechaUsuarioModifica = DateTime.Now
            };

            ServiceResult result = await _service.GuardarCeldaMatriz(entity);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> ClientesPorRecorrido(int idCamion, int idSemana, int idDia)
        {
            var data = await _service.ListarClientesPorRecorrido(idCamion, idSemana, idDia);
            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> HojaRuta(int idCamion, int idSemana, int idDia, DateTime? fecha, string? recorridos)
        {
            if (idCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (lista.Count == 0)
                return NotFound();

            var model = await _service.ObtenerHojaRuta(idCamion, lista, fecha?.Date ?? DateTime.Today);
            if (model == null)
                return NotFound();

            return View(model);
        }

        private static List<(int IdSemana, int IdDia)> ParseRecorridosHojaRuta(string? recorridos, int idSemana, int idDia)
        {
            if (!string.IsNullOrWhiteSpace(recorridos))
            {
                var lista = new List<(int IdSemana, int IdDia)>();
                var vistos = new HashSet<(int IdSemana, int IdDia)>();

                foreach (var part in recorridos.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    var bits = part.Split('_', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    if (bits.Length != 2)
                        continue;

                    if (!int.TryParse(bits[0], out var sem) || !int.TryParse(bits[1], out var dia))
                        continue;

                    if (sem <= 0 || dia <= 0)
                        continue;

                    var item = (sem, dia);
                    if (vistos.Add(item))
                        lista.Add(item);
                }

                return lista;
            }

            if (idSemana > 0 && idDia > 0)
                return new List<(int IdSemana, int IdDia)> { (idSemana, idDia) };

            return new List<(int IdSemana, int IdDia)>();
        }

        [HttpGet]
        public async Task<IActionResult> SugeridosPorRecoleccion(int idCamion, int idSemana, int idDia)
        {
            var data = await _service.ListarSugeridosPorRecoleccion(idCamion, idSemana, idDia);
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> InsertarClientesRecorridoBulk([FromBody] VMClientesRecorridoBulk model)
        {
            if (model == null)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "Datos incompletos.",
                    tipo = "validacion"
                });
            }

            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var items = (model.Items ?? new List<VMClientesRecorridoBulkItem>())
                .Where(x => x.IdCliente > 0)
                .Select(x => (x.IdCliente, x.IdEstablecimiento))
                .ToList();

            ServiceResult result = await _service.InsertarClientesRecorridoBulk(
                model.IdCamion,
                model.IdSemana,
                model.IdDia,
                idUsuario,
                items);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> BuscarClientes(
            string? texto,
            int? idCamion,
            int? idSemana,
            int? idDia)
        {
            var data = await _service.BuscarClientesRecorrido(texto ?? "", idCamion, idSemana, idDia);
            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> PorCliente(int idCliente)
        {
            try
            {
                return Ok(await _service.ListarPorCliente(idCliente));
            }
            catch
            {
                return Ok(Array.Empty<ClientesRecorridoDto>());
            }
        }

        [HttpPost]
        public async Task<IActionResult> InsertarClienteRecorrido([FromBody] VMClientesRecorrido model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = MapEntidad(model, idUsuario, esNuevo: true);
            ServiceResult result = await _service.InsertarClientesRecorrido(entity);

            return Ok(new
            {
                id = entity.Id,
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarClienteRecorrido([FromBody] VMClientesRecorrido model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = MapEntidad(model, idUsuario, esNuevo: false);
            ServiceResult result = await _service.ActualizarClientesRecorrido(entity);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarClienteRecorrido(int id)
        {
            ServiceResult result = await _service.EliminarClientesRecorrido(id);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfoClienteRecorrido(int id)
        {
            var r = await _service.ObtenerClientesRecorrido(id);

            if (r == null)
                return NotFound();

            return Ok(new
            {
                r.Id,
                r.IdCliente,
                Cliente = r.IdClienteNavigation?.Nombre,
                r.IdEstablecimiento,
                Establecimiento = r.IdEstablecimientoNavigation?.Nombre,
                r.IdCamion,
                Camion = r.IdCamionNavigation?.Nombre,
                r.IdSemana,
                Semana = r.IdSemanaNavigation?.Nombre,
                r.IdDia,
                Dia = r.IdDiaNavigation?.Nombre,
                r.Posicion,
                r.Activo,
                r.Observacion,
                r.FechaUsuarioRegistra,
                UsuarioRegistra = r.IdUsuarioRegistraNavigation?.Usuario,
                r.FechaUsuarioModifica,
                UsuarioModifica = r.IdUsuarioModificaNavigation?.Usuario
            });
        }

        private static ClientesRecorrido MapEntidad(VMClientesRecorrido model, int idUsuario, bool esNuevo)
        {
            var entity = new ClientesRecorrido
            {
                Id = model.Id,
                IdCliente = model.IdCliente,
                IdEstablecimiento = model.IdEstablecimiento,
                IdCamion = model.IdCamion,
                IdSemana = model.IdSemana,
                IdDia = model.IdDia,
                Posicion = model.Posicion,
                Activo = model.Activo,
                Observacion = string.IsNullOrWhiteSpace(model.Observacion) ? null : model.Observacion.Trim()
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
