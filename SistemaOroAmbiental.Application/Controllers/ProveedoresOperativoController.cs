using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProveedoresOperativoController : Controller
    {
        private readonly IProveedoresOperativoService _service;

        public ProveedoresOperativoController(IProveedoresOperativoService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> ControlMensual(int idProveedor, string? anios, string? meses)
        {
            try
            {
                var listaAnios = ParseCsvEnteros(anios);
                var listaMeses = ParseCsvEnteros(meses);

                if (!listaAnios.Any())
                    listaAnios.Add(DateTime.Now.Year);

                var data = await _service.ObtenerControlMensualFiltrado(idProveedor, listaAnios, listaMeses);

                if (data == null)
                    return Ok(CrearControlFiltradoVacio(idProveedor, listaAnios, listaMeses));

                return Ok(data);
            }
            catch
            {
                var listaAnios = ParseCsvEnteros(anios);
                var listaMeses = ParseCsvEnteros(meses);
                if (!listaAnios.Any()) listaAnios.Add(DateTime.Now.Year);
                if (!listaMeses.Any()) listaMeses = Enumerable.Range(1, 12).ToList();
                return Ok(CrearControlFiltradoVacio(idProveedor, listaAnios, listaMeses, parcial: true));
            }
        }

        [HttpPost]
        public async Task<IActionResult> GuardarControlMensual([FromBody] VMProveedorControlMensual model)
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

        private static ProveedorControlFiltradoDto CrearControlFiltradoVacio(
            int idProveedor,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses,
            bool parcial = false)
        {
            var mesesNorm = meses.Any() ? meses : Enumerable.Range(1, 12).ToList();
            var aniosNorm = anios.Any() ? anios : new List<int> { DateTime.Now.Year };

            var filas = new List<ProveedorControlMensualDto>();
            foreach (var anio in aniosNorm.OrderByDescending(a => a))
            {
                foreach (var mes in mesesNorm.OrderBy(m => m))
                {
                    filas.Add(new ProveedorControlMensualDto
                    {
                        Anio = anio,
                        Mes = mes,
                        MesNombre = new DateTime(anio, mes, 1).ToString("MMMM yyyy", new System.Globalization.CultureInfo("es-AR"))
                    });
                }
            }

            return new ProveedorControlFiltradoDto
            {
                IdProveedor = idProveedor,
                Filas = filas,
                DatosParciales = parcial
            };
        }

        private static ProveedoresControlMensual MapEntidad(VMProveedorControlMensual model)
            => new()
            {
                Id = model.Id,
                IdProveedor = model.IdProveedor,
                Anio = model.Anio,
                Mes = model.Mes,
                SinCompra = model.SinCompra,
                Observaciones = model.Observaciones
            };
    }
}
