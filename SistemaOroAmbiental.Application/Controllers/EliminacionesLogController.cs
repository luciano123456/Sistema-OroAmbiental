using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class EliminacionesLogController : Controller
    {
        private readonly IEliminacionesLogRepository _repo;
        private readonly IUsuariosService _usuarios;

        public EliminacionesLogController(IEliminacionesLogRepository repo, IUsuariosService usuarios)
        {
            _repo = repo;
            _usuarios = usuarios;
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
                var nombres = await ResolverNombresAsync(items);
                return Ok(items.Select(x =>
                {
                    var tipoCode = EliminacionLogAmbient.NormalizarTipo(x.Tipo);
                    var usuario = x.UsuarioNombre;
                    if (string.IsNullOrWhiteSpace(usuario) && x.IdUsuario is int uid && nombres.TryGetValue(uid, out var resuelto))
                        usuario = resuelto;

                    return new
                    {
                        x.Id,
                        Fecha = x.Fecha.ToString("dd/MM/yyyy HH:mm:ss"),
                        FechaDia = x.Fecha.ToString("dd/MM/yyyy"),
                        FechaHora = x.Fecha.ToString("HH:mm:ss"),
                        FechaIso = x.Fecha.ToString("o"),
                        UsuarioNombre = usuario,
                        x.IdUsuario,
                        Entidad = EliminacionLogAmbient.HumanizarEntidad(x.Entidad),
                        x.IdEntidad,
                        x.NombreEntidad,
                        Tipo = TipoEtiqueta(tipoCode),
                        TipoCode = tipoCode,
                        x.Detalle,
                        Ip = EliminacionLogAmbient.NormalizarIp(x.Ip)
                    };
                }));
            }
            catch
            {
                return Ok(Array.Empty<object>());
            }
        }

        private async Task<Dictionary<int, string>> ResolverNombresAsync(List<EliminacionLog> items)
        {
            var ids = items
                .Where(x => string.IsNullOrWhiteSpace(x.UsuarioNombre) && x.IdUsuario is > 0)
                .Select(x => x.IdUsuario!.Value)
                .Distinct()
                .ToList();

            var map = new Dictionary<int, string>();
            foreach (var id in ids)
            {
                try
                {
                    var user = await _usuarios.Obtener(id);
                    var nombre = EliminacionLogAmbient.NombreUsuario(user?.Nombre, user?.Apellido, user?.Usuario);
                    if (!string.IsNullOrWhiteSpace(nombre))
                        map[id] = nombre;
                }
                catch
                {
                    // Seguir con el resto.
                }
            }

            return map;
        }

        private static string TipoEtiqueta(string tipoCode)
            => tipoCode switch
            {
                EliminacionLog.TipoCascada => "Cascada (borrar asociados)",
                EliminacionLog.TipoDesvincular => "Cascada (desvincular)",
                _ => "Simple"
            };
    }
}
