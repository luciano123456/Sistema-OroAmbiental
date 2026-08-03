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
        private readonly IClientesEstablecimientosProductosService _productosEstService;

        public RecorridosController(
            IRecorridosService service,
            ICamionesService camionesService,
            IClientesEstablecimientosProductosService productosEstService)
        {
            _service = service;
            _camionesService = camionesService;
            _productosEstService = productosEstService;
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

        [HttpGet]
        public async Task<IActionResult> HojaRutaDatos(int idCamion, int idSemana, int idDia, DateTime? fecha, string? recorridos)
        {
            if (idCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (lista.Count == 0)
                return NotFound();

            var model = await _service.ObtenerHojaRuta(idCamion, lista, fecha?.Date ?? DateTime.Today);
            if (model == null)
                return NotFound();

            return Ok(model);
        }

        [HttpPost]
        public async Task<IActionResult> HojaRutaImprimir([FromBody] VMHojaRutaImprimirRequest request)
        {
            if (request == null || request.IdCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(request.Recorridos, request.IdSemana, request.IdDia);
            if (lista.Count == 0)
                return NotFound();

            var model = await _service.ObtenerHojaRuta(request.IdCamion, lista, request.Fecha?.Date ?? DateTime.Today);
            if (model == null)
                return NotFound();

            AplicarOverridesProductosHoja(model, request.Paradas);

            if (request.PersistirProductos)
            {
                var idClaim = User.FindFirst("Id")?.Value;
                if (int.TryParse(idClaim, out var idUsuario) && idUsuario > 0)
                    await PersistirProductosHojaRuta(request.Paradas, idUsuario);
            }

            return View("HojaRuta", model);
        }

        private async Task PersistirProductosHojaRuta(List<VMHojaRutaParadaOverride>? paradas, int idUsuario)
        {
            if (paradas == null) return;

            foreach (var parada in paradas)
            {
                if (parada.Productos == null) continue;
                foreach (var prod in parada.Productos)
                {
                    if (prod.Id <= 0) continue;
                    var entity = new ClientesEstablecimientosProducto
                    {
                        Id = prod.Id,
                        IdEstablecimiento = parada.IdEstablecimiento ?? 0,
                        IdProducto = prod.IdProducto,
                        Cantidad = prod.Cantidad,
                        IdListaPrecio = prod.IdListaPrecio > 0 ? prod.IdListaPrecio : null,
                        PrecioVenta = prod.PrecioVenta,
                        IdUsuarioModifica = idUsuario,
                        FechaUsuarioModifica = DateTime.Now
                    };
                    await _productosEstService.Actualizar(entity);
                }
            }
        }

        private static void AplicarOverridesProductosHoja(HojaRutaDto model, List<VMHojaRutaParadaOverride>? overrides)
        {
            if (model == null || overrides == null || overrides.Count == 0)
                return;

            var map = overrides
                .Where(o => o != null)
                .GroupBy(o => (o.IdCliente, o.IdEstablecimiento ?? 0))
                .ToDictionary(g => g.Key, g => g.Last());

            void AplicarAParada(HojaRutaParadaDto p)
            {
                var key = (p.IdCliente, p.IdEstablecimiento ?? 0);
                if (!map.TryGetValue(key, out var ov) || ov.Productos == null)
                    return;

                p.Productos = ov.Productos.Select(x => new HojaRutaParadaProductoDto
                {
                    Id = x.Id,
                    IdProducto = x.IdProducto,
                    Producto = x.Producto ?? "",
                    Abreviatura = x.Abreviatura,
                    Cantidad = x.Cantidad,
                    IdListaPrecio = x.IdListaPrecio,
                    ListaPrecio = x.ListaPrecio,
                    PrecioVenta = x.PrecioVenta,
                    PrecioEfectivo = x.PrecioEfectivo,
                    PrecioTransferencia = x.PrecioTransferencia
                }).ToList();

                p.ProductosResumen = FormatearProductosResumenHoja(p.Productos);
                if (p.Productos.Count > 0)
                {
                    p.AbonoEfectivo = p.Productos.Sum(x => Math.Round(x.Cantidad * x.PrecioEfectivo, 2));
                    p.AbonoTransferencia = p.Productos.Sum(x => Math.Round(x.Cantidad * x.PrecioTransferencia, 2));
                }
            }

            foreach (var p in model.Paradas ?? new List<HojaRutaParadaDto>())
                AplicarAParada(p);

            foreach (var s in model.Secciones ?? new List<HojaRutaSeccionDto>())
            {
                foreach (var p in s.Paradas ?? new List<HojaRutaParadaDto>())
                    AplicarAParada(p);
            }
        }

        private static string? FormatearProductosResumenHoja(IReadOnlyList<HojaRutaParadaProductoDto> productos)
        {
            if (productos == null || productos.Count == 0)
                return null;

            return string.Join(" · ", productos.Select(p =>
            {
                var abrev = !string.IsNullOrWhiteSpace(p.Abreviatura)
                    ? p.Abreviatura.Trim()
                    : (string.IsNullOrWhiteSpace(p.Producto) ? "PROD" : p.Producto.Trim());
                var cant = p.Cantidad % 1 == 0
                    ? ((int)p.Cantidad).ToString()
                    : p.Cantidad.ToString("0.####");
                return $"{cant} {abrev} x $ {p.PrecioVenta:N0}";
            }));
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
