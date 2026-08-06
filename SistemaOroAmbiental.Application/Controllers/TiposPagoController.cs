using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class TiposPagoController : Controller
    {
        private readonly ITiposPagoService _service;
        private readonly IDeleteConflictChecker _deleteChecker;

        public TiposPagoController(ITiposPagoService service, IDeleteConflictChecker deleteChecker)
        {
            _service = service;
            _deleteChecker = deleteChecker;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var items = (await _service.ObtenerTodos())
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModel
                {
                    Id = x.Id,
                    Nombre = x.Nombre,
                    Codigo = x.Codigo
                })
                .ToList();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var nombre = (model.Nombre ?? "").Trim();
            var codigo = NormalizarCodigo(model.Codigo, nombre);

            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });
            if (string.IsNullOrWhiteSpace(codigo))
                return Ok(new { valor = false, mensaje = "El código es obligatorio (Efectivo o Transferencia)." });

            var existe = (await _service.ObtenerTodos()).Any(x =>
                x.Codigo.Equals(codigo, StringComparison.OrdinalIgnoreCase));
            if (existe)
                return Ok(new { valor = false, mensaje = $"Ya existe un tipo de pago con código {codigo}." });

            var entity = new TiposPago
            {
                Nombre = nombre,
                Codigo = codigo,
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            var ok = await _service.Insertar(entity);
            return Ok(new { valor = ok, id = entity.Id, mensaje = ok ? "Registrado correctamente" : "No se pudo guardar" });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);
            var entity = await _service.Obtener(model.Id);
            if (entity == null)
                return NotFound(new { valor = false });

            var nombre = (model.Nombre ?? "").Trim();
            var codigo = NormalizarCodigo(model.Codigo, nombre);
            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio." });
            if (string.IsNullOrWhiteSpace(codigo))
                return Ok(new { valor = false, mensaje = "El código es obligatorio (Efectivo o Transferencia)." });

            var existe = (await _service.ObtenerTodos()).Any(x =>
                x.Id != entity.Id &&
                x.Codigo.Equals(codigo, StringComparison.OrdinalIgnoreCase));
            if (existe)
                return Ok(new { valor = false, mensaje = $"Ya existe un tipo de pago con código {codigo}." });

            entity.Nombre = nombre;
            entity.Codigo = codigo;
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            var ok = await _service.Actualizar(entity);
            return Ok(new { valor = ok, mensaje = ok ? "Modificado correctamente" : "No se pudo guardar" });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var bloqueo = await _deleteChecker.TipoPagoAsync(id);
            if (!string.IsNullOrWhiteSpace(bloqueo))
                return Ok(new { valor = false, mensaje = bloqueo, tipo = "relacion" });

            try
            {
                var ok = await _service.Eliminar(id);
                return Ok(new
                {
                    valor = ok,
                    mensaje = ok ? "Eliminado correctamente" : "No se encontró el registro.",
                    tipo = ok ? "success" : "validacion"
                });
            }
            catch (DbUpdateException)
            {
                var msg = await _deleteChecker.TipoPagoAsync(id)
                    ?? "No se pudo eliminar porque tiene registros relacionados.";
                return Ok(new { valor = false, mensaje = msg, tipo = "relacion" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModel
            {
                Id = entity.Id,
                Nombre = entity.Nombre,
                Codigo = entity.Codigo
            });
        }

        private static string NormalizarCodigo(string? codigo, string nombre)
        {
            var raw = (codigo ?? nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(raw)) return "";

            if (raw.Contains("efect", StringComparison.OrdinalIgnoreCase))
                return "Efectivo";
            if (raw.Contains("transf", StringComparison.OrdinalIgnoreCase)
                || raw.Contains("banco", StringComparison.OrdinalIgnoreCase))
                return "Transferencia";

            // Mantener el texto limpio si es otro código custom.
            return raw.Length > 30 ? raw.Substring(0, 30) : raw;
        }
    }
}
