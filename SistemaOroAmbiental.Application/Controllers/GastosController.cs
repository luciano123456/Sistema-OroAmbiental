using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class GastosController : Controller
    {
        private readonly IGastosService _service;

        public GastosController(IGastosService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpPost]
        public async Task<IActionResult> ListaFiltrada([FromBody] VMGastoFiltro? f)
        {
            var lista = await _service.ListarFiltrado(
                f?.FechaDesde,
                f?.FechaHasta,
                f?.IdCategoria,
                f?.IdCuenta,
                f?.IdSucursal,
                f?.Concepto,
                f?.ImporteMin);

            return Ok(lista.Select(MapToVm).ToList());
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var g = await _service.Obtener(id);
            if (g == null)
                return NotFound();

            return Ok(MapToVm(g));
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGasto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var gasto = MapFromVm(model);
            bool ok = await _service.Insertar(gasto, idUsuario);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGasto model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var gasto = MapFromVm(model);
            gasto.Id = model.Id;
            bool ok = await _service.Actualizar(gasto, idUsuario);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var entity = await _service.Obtener(id);
            if (entity == null)
                return Ok(new { valor = false, mensaje = "No se encontró el gasto.", tipo = "validacion" });

            try
            {
                bool ok = await _service.Eliminar(id);
                return Ok(new
                {
                    valor = ok,
                    mensaje = ok ? "Gasto eliminado correctamente." : "No se pudo eliminar el gasto.",
                    tipo = ok ? "success" : "error"
                });
            }
            catch (DbUpdateException)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "No se pudo eliminar el gasto porque tiene movimientos de caja u otros registros vinculados.",
                    tipo = "relacion"
                });
            }
        }

        private static VMGasto MapToVm(Gasto g) => new()
        {
            Id = g.Id,
            Fecha = g.Fecha,
            IdCategoria = g.IdCategoria,
            IdCuenta = g.IdCuenta,
            NumReferencia = g.NumReferencia,
            Concepto = g.Concepto,
            ImporteNeto = g.ImporteNeto,
            PorcIva = g.PorcIva,
            TotalIva = g.TotalIva,
            OtrosImpuestos = g.OtrosImpuestos,
            ImporteTotal = g.ImporteTotal,
            NotaInterna = g.NotaInterna,
            IdMovCaja = g.IdMovCaja,
            Categoria = g.IdCategoriaNavigation?.Nombre,
            Cuenta = g.IdCuentaNavigation?.Nombre,
            Sucursal = g.IdCuentaNavigation?.IdSucursalNavigation?.Nombre,
            FechaUsuarioRegistra = g.FechaUsuarioRegistra,
            UsuarioRegistra = g.IdUsuarioRegistraNavigation?.Usuario,
            FechaUsuarioModifica = g.FechaUsuarioModifica,
            UsuarioModifica = g.IdUsuarioModificaNavigation?.Usuario
        };

        private static Gasto MapFromVm(VMGasto m) => new()
        {
            Fecha = m.Fecha,
            IdCategoria = m.IdCategoria,
            IdCuenta = m.IdCuenta,
            NumReferencia = m.NumReferencia,
            Concepto = (m.Concepto ?? "").Trim(),
            ImporteNeto = m.ImporteNeto,
            PorcIva = m.PorcIva,
            TotalIva = m.TotalIva,
            OtrosImpuestos = m.OtrosImpuestos,
            ImporteTotal = m.ImporteTotal,
            NotaInterna = m.NotaInterna
        };
    }

}
