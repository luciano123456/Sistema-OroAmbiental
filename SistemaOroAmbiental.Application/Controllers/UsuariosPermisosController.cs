using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;

namespace SistemaOroAmbiental.Controllers
{
    public class UsuariosPermisosController : Controller
    {
        private readonly IUsuariosPermisosService _service;

        public UsuariosPermisosController(IUsuariosPermisosService service)
        {
            _service = service;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int idUsuario)
        {
            try
            {
                var (modulos, permisosUsuario, catalogo) = await _service.ObtenerFull(idUsuario);

                var lista = new List<object>();

                foreach (var modulo in modulos)
                {
                    var permisosDisponibles = catalogo
                        .Where(p => p.IdModulo == null || p.IdModulo == modulo.Id)
                        .OrderBy(p => p.Orden)
                        .ToList();

                    var permisosUsuarioModulo = permisosUsuario
                        .Where(x => x.IdModulo == modulo.Id && x.Activo == true)
                        .ToList();

                    var permisos = permisosDisponibles.Select(p => new
                    {
                        p.Id,
                        p.Codigo,
                        p.Nombre,
                        p.Descripcion,
                        Activo = permisosUsuarioModulo.Any(x => x.IdPermiso == p.Id)
                    }).ToList();

                    lista.Add(new
                    {
                        IdModulo = modulo.Id,
                        Modulo = modulo.Nombre,
                        CodigoModulo = modulo.Codigo,
                        Grupo = modulo.Grupo,
                        Permisos = permisos
                    });
                }

                return Ok(lista);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpPost]
        public async Task<IActionResult> Actualizar([FromBody] VMUsuariosPermisoUpdate model)
        {
            try
            {
                if (model == null)
                    return Ok(new { valor = false });

                int idUsuarioEjecuta = int.Parse(User.FindFirst("Id")!.Value);

                var resp = await _service.ActualizarIndividual(
                    model.IdUsuario,
                    model.IdModulo,
                    model.Permiso,
                    model.Activo,
                    idUsuarioEjecuta);

                return Ok(new { valor = resp });
            }
            catch
            {
                return Ok(new { valor = false });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ActualizarMasivo([FromBody] VMUsuariosPermisosLote model)
        {
            try
            {
                if (model == null || model.IdUsuario <= 0 || model.Permisos == null || model.Permisos.Count == 0)
                    return Ok(new { valor = false });

                int idUsuarioEjecuta = int.Parse(User.FindFirst("Id")!.Value);

                var cambios = model.Permisos
                    .Select(x => (x.IdModulo, x.Permiso, x.Activo))
                    .ToList();

                var resp = await _service.ActualizarMasivo(
                    model.IdUsuario,
                    cambios,
                    idUsuarioEjecuta);

                return Ok(new { valor = resp });
            }
            catch
            {
                return Ok(new { valor = false });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ReemplazarTodo([FromBody] VMUsuariosPermisosLote model)
        {
            try
            {
                if (model == null || model.IdUsuario <= 0)
                    return Ok(new { valor = false });

                int idUsuarioEjecuta = int.Parse(User.FindFirst("Id")!.Value);

                var permisosActivos = (model.Permisos ?? new List<VMUsuariosPermisoUpdate>())
                    .Where(x => x.Activo)
                    .Select(x => (x.IdModulo, x.Permiso))
                    .ToList();

                var resp = await _service.ReemplazarTodo(
                    model.IdUsuario,
                    permisosActivos,
                    idUsuarioEjecuta);

                return Ok(new { valor = resp });
            }
            catch
            {
                return Ok(new { valor = false });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CopiarDesdeRol([FromBody] VMUsuariosPermisosCopiarRol model)
        {
            try
            {
                if (model == null || model.IdUsuario <= 0 || model.IdRol <= 0)
                    return Ok(new { valor = false });

                int idUsuarioEjecuta = int.Parse(User.FindFirst("Id")!.Value);

                var resp = await _service.CopiarDesdeRol(
                    model.IdUsuario,
                    model.IdRol,
                    model.ReemplazarExistentes,
                    idUsuarioEjecuta);

                return Ok(new { valor = resp });
            }
            catch
            {
                return Ok(new { valor = false });
            }
        }
    }
}