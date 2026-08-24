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
            var entity = new TEntity();
            SetNombre(entity, model.Nombre ?? "");

            bool respuesta = await Service.Insertar(entity);

            return Ok(new { valor = respuesta, id = GetId(entity) });
        }

        [HttpPut]
        public virtual async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            var entity = await Service.Obtener(model.Id);
            if (entity == null)
                return NotFound();

            SetNombre(entity, model.Nombre ?? "");

            bool respuesta = await Service.Actualizar(entity);

            return Ok(new { valor = respuesta });
        }

        [HttpGet]
        public virtual async Task<IActionResult> DependenciasEliminar(int id, [FromServices] ICatalogoCascadeRepository cascade)
        {
            var info = await cascade.ObtenerDependenciasAsync<TEntity>(id);
            return Ok(info);
        }

        [HttpDelete]
        public virtual async Task<IActionResult> Eliminar(
            int id,
            [FromServices] ICatalogoCascadeRepository cascade,
            bool cascada = false)
        {
            try
            {
                var deps = await cascade.ObtenerDependenciasAsync<TEntity>(id);

                if (deps.TieneDependencias && !cascada)
                {
                    return Ok(new
                    {
                        valor = false,
                        mensaje = deps.MensajeResumen,
                        tipo = "dependencias"
                    });
                }

                if (deps.TieneDependencias && cascada)
                {
                    if (!deps.PermiteCascada)
                    {
                        return Ok(new
                        {
                            valor = false,
                            mensaje = deps.MensajeResumen,
                            tipo = "relacion"
                        });
                    }

                    await cascade.EliminarEnCascadaAsync<TEntity>(id);
                    return Ok(new
                    {
                        valor = true,
                        mensaje = "Eliminado correctamente. Los registros asociados se desvincularon o reasignaron.",
                        tipo = "success"
                    });
                }

                bool respuesta = await Service.Eliminar(id);
                return Ok(new
                {
                    valor = respuesta,
                    mensaje = respuesta ? "Eliminado correctamente" : "No se encontró el registro.",
                    tipo = respuesta ? "success" : "validacion"
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
