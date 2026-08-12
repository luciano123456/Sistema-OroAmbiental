using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Repository;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public abstract class ConfiguracionNombreControllerBase<TEntity> : Controller
        where TEntity : class, new()
    {
        protected readonly IConfiguracionNombreService<TEntity> Service;

        protected ConfiguracionNombreControllerBase(IConfiguracionNombreService<TEntity> service)
        {
            Service = service;
        }

        /// <summary>Etiqueta en singular para mensajes (ej. "día", "semana").</summary>
        protected virtual string NombreEntidadSingular => "registro";

        /// <summary>Artículo indefinido para mensajes ("un" / "una").</summary>
        protected virtual string ArticuloEntidad => "un";

        [AllowAnonymous]
        [HttpGet]
        public virtual async Task<IActionResult> Lista()
        {
            var items = (await Service.ObtenerTodos()).ToList();

            var lista = items.Select(e => new VMGenericModel
            {
                Id = GetId(e),
                Nombre = GetNombre(e)
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public virtual async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            var nombre = (model.Nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio.", tipo = "validacion" });

            var dup = await Service.BuscarDuplicado(null, nombre);
            if (dup != null)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = $"Ya existe {ArticuloEntidad} {NombreEntidadSingular} con el nombre '{GetNombre(dup)}'.",
                    tipo = "duplicado",
                    idReferencia = GetId(dup)
                });
            }

            var entity = new TEntity();
            SetNombre(entity, nombre);

            bool respuesta = await Service.Insertar(entity);

            return Ok(new
            {
                valor = respuesta,
                id = GetId(entity),
                mensaje = respuesta ? "Registrado correctamente" : "No se pudo guardar"
            });
        }

        [HttpPut]
        public virtual async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            var entity = await Service.Obtener(model.Id);
            if (entity == null)
                return NotFound();

            var nombre = (model.Nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(nombre))
                return Ok(new { valor = false, mensaje = "El nombre es obligatorio.", tipo = "validacion" });

            var dup = await Service.BuscarDuplicado(model.Id, nombre);
            if (dup != null)
            {
                return Ok(new
                {
                    valor = false,
                    mensaje = $"Ya existe {ArticuloEntidad} {NombreEntidadSingular} con el nombre '{GetNombre(dup)}'.",
                    tipo = "duplicado",
                    idReferencia = GetId(dup)
                });
            }

            SetNombre(entity, nombre);

            bool respuesta = await Service.Actualizar(entity);

            return Ok(new
            {
                valor = respuesta,
                mensaje = respuesta ? "Modificado correctamente" : "No se pudo guardar"
            });
        }

        [HttpDelete]
        public virtual async Task<IActionResult> Eliminar(int id, [FromServices] IDeleteConflictChecker deleteChecker)
        {
            var bloqueo = await deleteChecker.CatalogoAsync<TEntity>(id);
            if (!string.IsNullOrWhiteSpace(bloqueo))
                return Ok(new { valor = false, mensaje = bloqueo, tipo = "relacion" });

            try
            {
                bool respuesta = await Service.Eliminar(id);
                return Ok(new
                {
                    valor = respuesta,
                    mensaje = respuesta ? "Eliminado correctamente" : "No se encontró el registro.",
                    tipo = respuesta ? "success" : "validacion"
                });
            }
            catch (DbUpdateException)
            {
                var msg = await deleteChecker.CatalogoAsync<TEntity>(id)
                    ?? "No se pudo eliminar porque tiene registros relacionados.";
                return Ok(new { valor = false, mensaje = msg, tipo = "relacion" });
            }
        }

        [HttpGet]
        public virtual async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await Service.Obtener(id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModel
            {
                Id = GetId(entity),
                Nombre = GetNombre(entity)
            });
        }

        protected static int GetId(TEntity entity)
            => (int)(entity.GetType().GetProperty("Id")!.GetValue(entity)!);

        protected static string GetNombre(TEntity entity)
            => entity.GetType().GetProperty("Nombre")?.GetValue(entity)?.ToString() ?? "";

        protected static void SetNombre(TEntity entity, string nombre)
            => entity.GetType().GetProperty("Nombre")!.SetValue(entity, nombre);
    }
}
