using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class EliminacionesLogController : Controller
    {
        private readonly IEliminacionesLogRepository _repo;

        public EliminacionesLogController(IEliminacionesLogRepository repo)
        {
            _repo = repo;
        }

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            try
            {
                var items = await _repo.ListarAsync(500);
                return Ok(items.Select(x => new
                {
                    x.Id,
                    Fecha = x.Fecha.ToString("dd/MM/yyyy HH:mm:ss"),
                    x.UsuarioNombre,
                    x.IdUsuario,
                    x.Entidad,
                    x.IdEntidad,
                    x.NombreEntidad,
                    Tipo = TipoEtiqueta(x.Tipo),
                    x.Detalle,
                    x.Ip
                }));
            }
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        private static string TipoEtiqueta(string? tipo)
            => tipo switch
            {
                EliminacionLog.TipoCascada => "Cascada (borrar asociados)",
                EliminacionLog.TipoDesvincular => "Cascada (desvincular)",
                _ => "Simple"
            };
    }
}
