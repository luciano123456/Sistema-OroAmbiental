using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.DAL.DataContext;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class ProductosController : Controller
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProductosController(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var lista = await _db.Productos.AsNoTracking()
                .OrderBy(x => x.Nombre)
                .Select(x => new VMGenericModel { Id = x.Id, Nombre = x.Nombre })
                .ToListAsync();

            return Ok(lista);
        }
    }
}
