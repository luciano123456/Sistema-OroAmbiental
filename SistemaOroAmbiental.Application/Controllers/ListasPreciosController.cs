using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ListasPreciosController : Controller
    {
        private readonly SistemaOroAmbientalContext _db;

        public ListasPreciosController(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var lista = await _db.ListasPrecios.AsNoTracking()
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModel { Id = x.Id, Nombre = x.Nombre })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = new ListasPrecio
            {
                Nombre = model.Nombre ?? "",
                IdUsuarioRegistra = idUsuario,
                FechaUsuarioRegistra = DateTime.Now
            };

            _db.ListasPrecios.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new { valor = true, id = entity.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            int idUsuario = int.Parse(User.FindFirst("Id")!.Value);

            var entity = await _db.ListasPrecios.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null)
                return NotFound();

            entity.Nombre = model.Nombre ?? "";
            entity.IdUsuarioModifica = idUsuario;
            entity.FechaUsuarioModifica = DateTime.Now;

            await _db.SaveChangesAsync();
            return Ok(new { valor = true });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var entity = await _db.ListasPrecios.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return Ok(new { valor = false });

            _db.ListasPrecios.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok(new { valor = true });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var entity = await _db.ListasPrecios.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return NotFound();

            return Ok(new VMGenericModel { Id = entity.Id, Nombre = entity.Nombre });
        }
    }
}
