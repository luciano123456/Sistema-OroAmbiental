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
    public class RecorridosController : Controller
    {
        private readonly IRecorridosService _service;
        private readonly ICamionesService _camionesService;
        private readonly IClientesEstablecimientosProductosService _productosEstService;
        private readonly IWebHostEnvironment _env;
        private readonly CertificadosTratamientoStorage _certStorage;
        private readonly IClientesCertificadosTratamientoRepository _certRepo;

        public RecorridosController(
            IRecorridosService service,
            ICamionesService camionesService,
            IClientesEstablecimientosProductosService productosEstService,
            IWebHostEnvironment env,
            CertificadosTratamientoStorage certStorage,
            IClientesCertificadosTratamientoRepository certRepo)
        {
            _service = service;
            _camionesService = camionesService;
            _productosEstService = productosEstService;
            _env = env;
            _certStorage = certStorage;
            _certRepo = certRepo;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Camiones(bool soloActivos = true)
        {
            var camiones = await (await _camionesService.ObtenerTodos(soloActivos))
                .OrderBy(c => c.Nombre)
                .Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    c.Activo
                })
                .ToListAsync();

            return Ok(camiones);
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
        public async Task<IActionResult> HojaRuta(
            int idCamion,
            int idSemana,
            int idDia,
            DateTime? fecha,
            string? recorridos,
            string? excluirIds)
        {
            if (idCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (lista.Count == 0)
                return NotFound();

            var excluir = ParseIdsExcluirHoja(excluirIds);
            var model = await _service.ObtenerHojaRuta(idCamion, lista, fecha?.Date ?? DateTime.Today, excluir);
            if (model == null)
                return NotFound();

            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> HojaRutaDatos(
            int idCamion,
            int idSemana,
            int idDia,
            DateTime? fecha,
            string? recorridos,
            string? excluirIds)
        {
            if (idCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (lista.Count == 0)
                return NotFound();

            var excluir = ParseIdsExcluirHoja(excluirIds);
            var model = await _service.ObtenerHojaRuta(idCamion, lista, fecha?.Date ?? DateTime.Today, excluir);
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

            var model = await _service.ObtenerHojaRuta(
                request.IdCamion,
                lista,
                request.Fecha?.Date ?? DateTime.Today,
                request.ExcluirIds);
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

        [HttpGet]
        public async Task<IActionResult> SiguienteNumeroManifiesto(
            int idCamion,
            int idSemana,
            int idDia,
            string? recorridos)
        {
            if (idCamion <= 0)
                return Ok(new { numero = 1, ultimo = 0 });

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (lista.Count == 0)
                return Ok(new { numero = 1, ultimo = 0 });

            var numero = await _service.ObtenerSiguienteNumeroManifiesto(idCamion, lista);
            return Ok(new
            {
                numero,
                ultimo = Math.Max(0, numero - 1)
            });
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarNumeroManifiesto([FromBody] VMManifiestoNumeroRequest request)
        {
            if (request == null || request.IdCamion <= 0)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "Datos incompletos.",
                    tipo = "validacion"
                });
            }

            var lista = ParseRecorridosHojaRuta(request.Recorridos, request.IdSemana, request.IdDia);
            if (lista.Count == 0)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "No se indicó la hoja de ruta.",
                    tipo = "validacion"
                });
            }

            var idClaim = User.FindFirst("Id")?.Value;
            int.TryParse(idClaim, out var idUsuario);

            var result = await _service.RegistrarUltimoNumeroManifiesto(
                request.IdCamion,
                lista,
                request.UltimoNumero,
                idUsuario);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> Manifiestos(
            int idCamion,
            int idSemana,
            int idDia,
            string? recorridos,
            string? excluirIds,
            int? numeroInicial,
            int? idRecorrido,
            string? nombre,
            DateTime? fecha,
            bool generarCertificados = false,
            DateTime? fechaEmision = null,
            int? numeroCertificadoInicial = null,
            DateTime? fechaTratamiento = null,
            int? numeroOrdenInicial = null,
            string? formato = null)
        {
            if (idCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (lista.Count == 0)
                return NotFound();

            var numero = numeroInicial ?? 0;
            if (numero <= 0)
                numero = await _service.ObtenerSiguienteNumeroManifiesto(idCamion, lista);

            var excluir = ParseIdsExcluirHoja(excluirIds);
            var model = await _service.ObtenerManifiestos(
                idCamion,
                lista,
                numero,
                excluir,
                idRecorrido);

            if (model == null)
                return NotFound();

            var nombreTxt = (nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombreTxt) && model.Items.Count == 1)
                nombreTxt = model.Items[0].RazonSocial;
            model.Nombre = nombreTxt;
            if (!string.IsNullOrWhiteSpace(nombreTxt))
                model.Titulo = nombreTxt;
            model.FechaProgramacion = (fecha ?? DateTime.Today).Date;

            var idClaim = User.FindFirst("Id")?.Value;
            int.TryParse(idClaim, out var idUsuario);

            var fmt = (formato ?? "").Trim().ToLowerInvariant();
            var soloCertificados = fmt == "certificados";

            byte[]? mfBytes = null;
            string mfNombre = ManifiestoPdfGenerator.NombreArchivo(model);
            GuardarHistorialManifiestoResultDto historial = new();

            if (!soloCertificados)
            {
                var ultimo = model.NumeroInicial + Math.Max(0, model.Items.Count - 1);
                if (ultimo > 0)
                    await _service.RegistrarUltimoNumeroManifiesto(idCamion, lista, ultimo, idUsuario);

                historial = await _service.GuardarHistorialManifiestos(idCamion, model, nombreTxt, idUsuario);
                mfBytes = GenerarBytesManifiesto(model);

                if (!generarCertificados)
                    return File(mfBytes, "application/pdf", mfNombre);
            }
            else if (!generarCertificados)
            {
                return NotFound();
            }

            try
            {
                var fe = (fechaEmision ?? DateTime.Today).Date;
                var ft = (fechaTratamiento ?? DateTime.Today).Date;
                var nCert = numeroCertificadoInicial ?? 0;
                var nOrden = numeroOrdenInicial ?? 0;
                if (nCert <= 0 || nOrden <= 0)
                {
                    var sug = await _certRepo.ObtenerSiguienteNumero(0, 0);
                    if (nCert <= 0) nCert = sug.NumeroCertificado;
                    if (nOrden <= 0) nOrden = sug.NumeroOrden;
                }

                List<CertificadoTratamientoItemDto> certItems;
                if (soloCertificados)
                {
                    certItems = new List<CertificadoTratamientoItemDto>();
                    for (var i = 0; i < model.Items.Count; i++)
                    {
                        certItems.Add(CertificadoTratamientoPdfGenerator.DesdeManifiestoItem(
                            model.Items[i], fe, nCert + i, ft, nOrden + i));
                    }
                }
                else
                {
                    certItems = await _certStorage.GenerarYGuardarLote(
                        model, historial, fe, nCert, ft, nOrden, idCamion, idUsuario);
                }

                if (certItems.Count == 0)
                {
                    if (mfBytes != null)
                        return File(mfBytes, "application/pdf", mfNombre);
                    return NotFound();
                }

                var certBytes = CertificadoTratamientoPdfGenerator.Generar(certItems);
                var certNombre = CertificadoTratamientoPdfGenerator.NombreArchivoLote(certItems);

                if (soloCertificados || fmt == "certificados")
                    return File(certBytes, "application/pdf", certNombre);

                if (fmt == "zip" && mfBytes != null)
                {
                    var zip = PdfZipHelper.CrearZip((mfNombre, mfBytes), (certNombre, certBytes));
                    return File(zip, "application/zip",
                        model.Items.Count == 1 ? "Manifiesto_y_Certificado.zip" : "Manifiestos_y_Certificados.zip");
                }

                // Por defecto: solo el manifiesto (el front pide el certificado en otra descarga).
                return File(mfBytes!, "application/pdf", mfNombre);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("[Certificados] " + ex);
                if (mfBytes != null)
                    return File(mfBytes, "application/pdf", mfNombre);
                return StatusCode(500, "No se pudieron generar los certificados.");
            }
        }

        [HttpGet]
        public async Task<IActionResult> CertificadoHistorial(
            int idCamion,
            int idManifiesto,
            DateTime? fechaEmision,
            int? numeroCertificado,
            DateTime? fechaTratamiento,
            int? numeroOrden)
        {
            if (idCamion <= 0 || idManifiesto <= 0)
                return NotFound();

            var model = await _service.ObtenerManifiestosHistorial(idCamion, new[] { idManifiesto });
            if (model == null || model.Items.Count == 0)
                return NotFound();

            var idClaim = User.FindFirst("Id")?.Value;
            int.TryParse(idClaim, out var idUsuario);

            var fe = (fechaEmision ?? DateTime.Today).Date;
            var ft = (fechaTratamiento ?? DateTime.Today).Date;
            var nCert = numeroCertificado ?? 0;
            var nOrden = numeroOrden ?? 0;
            if (nCert <= 0 || nOrden <= 0)
            {
                var sug = await _certRepo.ObtenerSiguienteNumero(0, 0);
                if (nCert <= 0) nCert = sug.NumeroCertificado;
                if (nOrden <= 0) nOrden = sug.NumeroOrden;
            }

            var certItems = await _certStorage.GenerarDesdeHistorial(
                model, idManifiesto, fe, nCert, ft, nOrden, idCamion, idUsuario);

            if (certItems.Count == 0)
                return NotFound();

            var bytes = CertificadoTratamientoPdfGenerator.Generar(certItems);
            return File(bytes, "application/pdf", CertificadoTratamientoPdfGenerator.NombreArchivo(certItems[0]));
        }

        [HttpGet]
        public async Task<IActionResult> SiguienteNumeroCertificado()
        {
            var data = await _certRepo.ObtenerSiguienteNumero(0, 0);
            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> ManifiestosPorCamion(int idCamion)
        {
            if (idCamion <= 0)
                return BadRequest();

            var data = await _service.ListarManifiestosPorCamion(idCamion);
            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> RutasManifiestoCamion(int idCamion)
        {
            if (idCamion <= 0)
                return BadRequest();

            var data = await _service.ListarRutasManifiestoCamion(idCamion);
            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> ManifiestoHistorial(int idCamion, string? ids)
        {
            if (idCamion <= 0)
                return NotFound();

            var listaIds = (ids ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(x => int.TryParse(x, out var n) ? n : 0)
                .Where(n => n > 0)
                .ToList();

            if (listaIds.Count == 0)
                return NotFound();

            var model = await _service.ObtenerManifiestosHistorial(idCamion, listaIds);
            if (model == null)
                return NotFound();

            if (model.FechaProgramacion == default)
                model.FechaProgramacion = DateTime.Today;

            return PdfManifiesto(model);
        }

        [HttpGet]
        public async Task<IActionResult> SiguienteNumeroManifiestoCamion(int idCamion)
        {
            var numero = await _service.ObtenerSiguienteNumeroManifiestoCamion(idCamion);
            return Ok(new
            {
                numero,
                ultimo = Math.Max(0, numero - 1)
            });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarManifiestoHistorial(int idCamion, int id)
        {
            var result = await _service.EliminarManifiestoHistorial(idCamion, id);
            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        [HttpGet]
        public async Task<IActionResult> ArchivoIntercambio(
            int idCamion,
            int idSemana,
            int idDia,
            string? recorridos,
            string? excluirIds,
            string? incluirIds,
            DateTime? fecha,
            int? numeroInicial,
            int? idRecorrido,
            string? nombre,
            bool mesCompleto = false)
        {
            if (idCamion <= 0)
                return NotFound();

            var lista = ParseRecorridosHojaRuta(recorridos, idSemana, idDia);
            if (!mesCompleto && lista.Count == 0)
                return NotFound();

            var incluir = ParseIdsExcluirHoja(incluirIds);
            var excluir = incluir.Count > 0 ? new List<int>() : ParseIdsExcluirHoja(excluirIds);

            var numero = numeroInicial ?? 0;
            if (numero <= 0)
            {
                numero = mesCompleto
                    ? await _service.ObtenerSiguienteNumeroManifiestoCamion(idCamion)
                    : await _service.ObtenerSiguienteNumeroManifiesto(idCamion, lista);
            }

            var model = await _service.ObtenerArchivoIntercambio(
                idCamion,
                lista,
                fecha?.Date ?? DateTime.Today,
                numero,
                excluir,
                idRecorrido,
                nombre,
                mesCompleto,
                incluir.Count > 0 ? incluir : null);

            if (model == null || model.Items.Count == 0)
                return NotFound();

            var bytes = ArchivoIntercambioFormatter.Generar(model);

            var idClaim = User.FindFirst("Id")?.Value;
            int.TryParse(idClaim, out var idUsuario);
            var ultimo = model.NumeroInicial + model.Items.Count - 1;
            var listaRegistro = ParseRecorridosHojaRuta(model.RecorridosParam, 0, 0);
            if (listaRegistro.Count == 0)
                listaRegistro = lista;
            if (ultimo > 0 && listaRegistro.Count > 0)
                await _service.RegistrarUltimoNumeroManifiesto(idCamion, listaRegistro, ultimo, idUsuario);

            return File(bytes, "text/plain; charset=windows-1252", model.NombreArchivo);
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
                    // Mismo producto con distintas listas: no duplicar abonos.
                    var unicos = p.Productos.GroupBy(x => x.IdProducto).Select(g => g.First());
                    p.AbonoEfectivo = unicos.Sum(x => Math.Round(x.Cantidad * x.PrecioEfectivo, 2));
                    p.AbonoTransferencia = unicos.Sum(x => Math.Round(x.Cantidad * x.PrecioTransferencia, 2));
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

        private FileContentResult PdfManifiesto(ManifiestosHojaDto model)
        {
            var bytes = GenerarBytesManifiesto(model);
            return File(bytes, "application/pdf", ManifiestoPdfGenerator.NombreArchivo(model));
        }

        private byte[] GenerarBytesManifiesto(ManifiestosHojaDto model)
        {
            var header = Path.Combine(_env.WebRootPath, "Imagenes", "manifiesto-header.jpg");
            return ManifiestoPdfGenerator.Generar(model, header);
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

        private static List<int> ParseIdsExcluirHoja(string? excluirIds)
        {
            var lista = new List<int>();
            if (string.IsNullOrWhiteSpace(excluirIds))
                return lista;

            foreach (var part in excluirIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (int.TryParse(part, out var id) && id > 0)
                    lista.Add(id);
            }

            return lista.Distinct().ToList();
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
            ServiceResult result = await _service.InsertarClientesRecorrido(entity, model.DesplazarSiOcupada);

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
            ServiceResult result = await _service.ActualizarClientesRecorrido(entity, model.DesplazarSiOcupada);

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
                r.Reprogramado,
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
                Reprogramado = model.Reprogramado,
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
