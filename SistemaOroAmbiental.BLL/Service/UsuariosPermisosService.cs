using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class UsuariosPermisosService : IUsuariosPermisosService
    {
        private readonly IUsuariosPermisosRepository _repo;

        public UsuariosPermisosService(IUsuariosPermisosRepository repo)
        {
            _repo = repo;
        }

        public async Task<(List<UsuariosModulo>, List<UsuariosPermisosUsuario>, List<UsuariosPermiso>)> ObtenerFull(int idUsuario)
        {
            try
            {
                var modulos = await _repo.ObtenerModulosActivos();
                var permisosUsuario = await _repo.ObtenerPermisosUsuario(idUsuario);
                var catalogo = await _repo.ObtenerPermisosActivos();

                return (modulos, permisosUsuario, catalogo);
            }
            catch
            {
                return (new List<UsuariosModulo>(), new List<UsuariosPermisosUsuario>(), new List<UsuariosPermiso>());
            }
        }

        public async Task<bool> ActualizarIndividual(
            int idUsuario,
            int idModulo,
            string codigoPermiso,
            bool activo,
            int idUsuarioEjecuta)
        {
            try
            {
                var catalogo = await _repo.ObtenerPermisosActivos();
                var permiso = catalogo.FirstOrDefault(x => x.Codigo == codigoPermiso);

                if (permiso == null) return false;

                var existente = await _repo.ObtenerPermisoUsuario(idUsuario, idModulo, permiso.Id);

                if (existente == null)
                {
                    await _repo.RegistrarPermisoUsuario(new UsuariosPermisosUsuario
                    {
                        IdUsuario = idUsuario,
                        IdModulo = idModulo,
                        IdPermiso = permiso.Id,
                        Activo = activo,
                        IdUsuarioRegistra = idUsuarioEjecuta,
                        FechaRegistra = DateTime.Now
                    });
                }
                else
                {
                    existente.Activo = activo;
                    existente.IdUsuarioModifica = idUsuarioEjecuta;
                    existente.FechaModifica = DateTime.Now;

                    _repo.ActualizarPermisoUsuario(existente);
                }

                return await _repo.SaveChanges();
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> ActualizarMasivo(
            int idUsuario,
            List<(int idModulo, string codigoPermiso, bool activo)> cambios,
            int idUsuarioEjecuta)
        {
            try
            {
                var catalogo = await _repo.ObtenerPermisosActivos();
                var existentes = await _repo.ObtenerPermisosUsuario(idUsuario);

                foreach (var c in cambios)
                {
                    var permiso = catalogo.FirstOrDefault(x => x.Codigo == c.codigoPermiso);
                    if (permiso == null) continue;

                    var existente = existentes.FirstOrDefault(x =>
                        x.IdModulo == c.idModulo &&
                        x.IdPermiso == permiso.Id);

                    if (existente == null)
                    {
                        await _repo.RegistrarPermisoUsuario(new UsuariosPermisosUsuario
                        {
                            IdUsuario = idUsuario,
                            IdModulo = c.idModulo,
                            IdPermiso = permiso.Id,
                            Activo = c.activo,
                            IdUsuarioRegistra = idUsuarioEjecuta,
                            FechaRegistra = DateTime.Now
                        });
                    }
                    else
                    {
                        existente.Activo = c.activo;
                        existente.IdUsuarioModifica = idUsuarioEjecuta;
                        existente.FechaModifica = DateTime.Now;

                        _repo.ActualizarPermisoUsuario(existente);
                    }
                }

                return await _repo.SaveChanges();
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> ReemplazarTodo(
            int idUsuario,
            List<(int idModulo, string codigoPermiso)> permisosActivos,
            int idUsuarioEjecuta)
        {
            try
            {
                var catalogo = await _repo.ObtenerPermisosActivos();
                var existentes = await _repo.ObtenerPermisosUsuario(idUsuario);

                var mapa = catalogo.ToDictionary(x => x.Codigo, x => x.Id);

                var deseados = permisosActivos
                    .Where(x => mapa.ContainsKey(x.codigoPermiso))
                    .Select(x => new { x.idModulo, IdPermiso = mapa[x.codigoPermiso] })
                    .ToList();

                foreach (var ex in existentes)
                {
                    bool activo = deseados.Any(x =>
                        x.idModulo == ex.IdModulo &&
                        x.IdPermiso == ex.IdPermiso);

                    ex.Activo = activo;
                    ex.IdUsuarioModifica = idUsuarioEjecuta;
                    ex.FechaModifica = DateTime.Now;

                    _repo.ActualizarPermisoUsuario(ex);
                }

                foreach (var d in deseados)
                {
                    bool existe = existentes.Any(x =>
                        x.IdModulo == d.idModulo &&
                        x.IdPermiso == d.IdPermiso);

                    if (!existe)
                    {
                        await _repo.RegistrarPermisoUsuario(new UsuariosPermisosUsuario
                        {
                            IdUsuario = idUsuario,
                            IdModulo = d.idModulo,
                            IdPermiso = d.IdPermiso,
                            Activo = true,
                            IdUsuarioRegistra = idUsuarioEjecuta,
                            FechaRegistra = DateTime.Now
                        });
                    }
                }

                return await _repo.SaveChanges();
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> CopiarDesdeRol(
            int idUsuario,
            int idRol,
            bool reemplazarExistentes,
            int idUsuarioEjecuta)
        {
            try
            {
                var permisosRol = await _repo.ObtenerPermisosRolActivo(idRol);

                if (reemplazarExistentes)
                {
                    var lista = permisosRol
                        .Select(x => (x.IdModulo, x.IdPermisoNavigation.Codigo))
                        .ToList();

                    return await ReemplazarTodo(idUsuario, lista, idUsuarioEjecuta);
                }
                else
                {
                    var cambios = permisosRol
                        .Select(x => (x.IdModulo, x.IdPermisoNavigation.Codigo, true))
                        .ToList();

                    return await ActualizarMasivo(idUsuario, cambios, idUsuarioEjecuta);
                }
            }
            catch
            {
                return false;
            }
        }
    }
}