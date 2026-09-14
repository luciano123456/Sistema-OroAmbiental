using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.ResponseCaching;
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
        private readonly ICatalogoCascadeRepository _cascade;

        public TiposPagoController(ITiposPagoService service, ICatalogoCascadeRepository cascade)
        {
            _service = service;
            _cascade = cascade;
        }

        [AllowAnonymous]
        [HttpGet]
        [ResponseCache(Duration = 600, Location = ResponseCacheLocation.Any)]
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

            var existe = await _service.ExisteCodigo(codigo);
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

            var existe = await _service.ExisteCodigo(codigo, entity.Id);
            if (existe)
                return Ok(new { valor = false, mensaje = $"Ya existe un tipo de pago con código {codigo}." });

            entity.Nombre = nombre;
            entity.Codigo = codigo;
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            var ok = await _service.Actualizar(entity);
            return Ok(new { valor = ok, mensaje = ok ? "Modificado correctamente" : "No se pudo guardar" });
        }

        [HttpGet]
        public async Task<IActionResult> DependenciasEliminar(int id)
        {
            var info = await _cascade.ObtenerDependenciasAsync<TiposPago>(id);
            return Ok(info);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id, bool cascada = false)
        {
            try
            {
                var deps = await _cascade.ObtenerDependenciasAsync<TiposPago>(id);
                if (deps.TieneDependencias && !cascada)
                    return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "dependencias" });

                if (deps.TieneDependencias && cascada)
                {
                    if (!deps.PermiteCascada)
                        return Ok(new { valor = false, mensaje = deps.MensajeResumen, tipo = "relacion" });

                    await _cascade.EliminarEnCascadaAsync<TiposPago>(id);
                    return Ok(new
                    {
                        valor = true,
                        mensaje = "Eliminado correctamente. Los registros asociados se desvincularon.",
                        tipo = "success"
                    });
                }

                var ok = await _service.Eliminar(id);
                return Ok(new
                {
                    valor = ok,
                    mensaje = ok ? "Eliminado correctamente" : "No se encontró el registro.",
                    tipo = ok ? "success" : "validacion"
                });
            }
            catch (InvalidOperationException ex)
            {
                return Ok(new { valor = false, mensaje = ex.Message, tipo = "relacion" });
            }
            catch (DbUpdateException)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = "No se pudo eliminar porque tiene registros relacionados.",
                    tipo = "relacion"
                });
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
