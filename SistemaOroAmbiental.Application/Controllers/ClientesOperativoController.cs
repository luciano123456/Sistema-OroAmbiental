using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ClientesOperativoController : Controller
    {
        private readonly IClientesOperativoService _service;

        public ClientesOperativoController(IClientesOperativoService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Dashboard()
        {
            try
            {
                return Ok(await _service.ObtenerDashboard());
            }
            catch
            {
                return Ok(new ClientesDashboardDto());
            }
        }

        [HttpGet]
        public async Task<IActionResult> ControlMensual(int idCliente, string? anios, string? meses)
        {
            try
            {
                var listaAnios = ParseCsvEnteros(anios);
                var listaMeses = ParseCsvEnteros(meses);

                if (!listaAnios.Any())
                    listaAnios.Add(DateTime.Now.Year);

                var data = await _service.ObtenerControlMensualFiltrado(idCliente, listaAnios, listaMeses);

                if (data == null)
                    return Ok(CrearControlFiltradoVacio(idCliente, listaAnios, listaMeses));

                return Ok(data);
            }
            catch
            {
                var listaAnios = ParseCsvEnteros(anios);
                var listaMeses = ParseCsvEnteros(meses);
                if (!listaAnios.Any()) listaAnios.Add(DateTime.Now.Year);
                if (!listaMeses.Any()) listaMeses = Enumerable.Range(1, 12).ToList();
                return Ok(CrearControlFiltradoVacio(idCliente, listaAnios, listaMeses, parcial: true));
            }
        }

        [HttpGet]
        public async Task<IActionResult> ControlAnual(int idCliente, int? anio)
        {
            try
            {
                var data = await _service.ObtenerControlAnual(idCliente, anio ?? DateTime.Now.Year);
                if (data == null)
                    return NotFound();

                return Ok(data);
            }
            catch
            {
                return Ok(CrearControlAnualVacio(idCliente, anio ?? DateTime.Now.Year));
            }
        }

        [HttpGet]
        public async Task<IActionResult> StockCliente(int idCliente)
            => Ok(await _service.ObtenerStockCliente(idCliente));

        [HttpPost]
        public async Task<IActionResult> GuardarControlMensual([FromBody] VMClienteControlMensual model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var entity = MapEntidad(model);
            var result = await _service.GuardarControlMensual(entity, idUsuario);

            return Ok(new
            {
                valor = result.Ok,
                mensaje = result.Mensaje,
                tipo = result.Tipo
            });
        }

        private static List<int> ParseCsvEnteros(string? csv)
        {
            if (string.IsNullOrWhiteSpace(csv))
                return new List<int>();

            return csv
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var n) ? n : 0)
                .Where(n => n > 0)
                .Distinct()
                .ToList();
        }

        private static ClienteControlFiltradoDto CrearControlFiltradoVacio(
            int idCliente,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses,
            bool parcial = false)
        {
            var mesesNorm = meses.Any() ? meses : Enumerable.Range(1, 12).ToList();
            var aniosNorm = anios.Any() ? anios : new List<int> { DateTime.Now.Year };

            var filas = new List<ClienteControlMensualDto>();
            foreach (var anio in aniosNorm.OrderByDescending(a => a))
            {
                foreach (var mes in mesesNorm.OrderBy(m => m))
                {
                    filas.Add(new ClienteControlMensualDto
                    {
                        Anio = anio,
                        Mes = mes,
                        MesNombre = new DateTime(anio, mes, 1).ToString("MMMM", new System.Globalization.CultureInfo("es-AR"))
                    });
                }
            }

            return new ClienteControlFiltradoDto
            {
                IdCliente = idCliente,
                Filas = filas,
                DatosParciales = parcial
            };
        }

        private static ClienteControlAnualDto CrearControlAnualVacio(int idCliente, int anio)
        {
            var meses = Enumerable.Range(1, 12).Select(m => new ClienteControlMensualDto
            {
                Anio = anio,
                Mes = m,
                MesNombre = new DateTime(anio, m, 1).ToString("MMMM", new System.Globalization.CultureInfo("es-AR"))
            }).ToList();

            return new ClienteControlAnualDto
            {
                Anio = anio,
                IdCliente = idCliente,
                Meses = meses
            };
        }

        private static ClientesControlMensual MapEntidad(VMClienteControlMensual model)
            => new()
            {
                Id = model.Id,
                IdCliente = model.IdCliente,
                Anio = model.Anio,
                Mes = model.Mes,
                FechaVisita = model.FechaVisita,
                SinEntrega = model.SinEntrega,
                CajasAFavor = model.CajasAFavor,
                Observaciones = model.Observaciones,
                AbonoEfectivo = model.AbonoEfectivo,
                AbonoTransferencia = model.AbonoTransferencia,
                FechaTransferencia = model.FechaTransferencia
            };
    }
}
