using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosPermisosRepository : IUsuariosPermisosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public UsuariosPermisosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<UsuariosModulo>> ObtenerModulosActivos()
        {
            try
            {
                return await _db.Set<UsuariosModulo>()
                    .AsNoTracking()
                    .Where(x => x.Activo == true)
                    .OrderBy(x => x.Orden)
                    .ThenBy(x => x.Nombre)
                    .ToListAsync();
            }
            catch
            {
                return new List<UsuariosModulo>();
            }
        }

        public async Task<List<UsuariosPermiso>> ObtenerPermisosActivos()
        {
            try
            {
                return await _db.Set<UsuariosPermiso>()
                    .AsNoTracking()
                    .Where(x => x.Activo == true)
                    .OrderBy(x => x.Orden)
                    .ThenBy(x => x.Nombre)
                    .ToListAsync();
            }
            catch
            {
                return new List<UsuariosPermiso>();
            }
        }

        public async Task<List<UsuariosPermisosUsuario>> ObtenerPermisosUsuario(int idUsuario)
        {
            try
            {
                return await _db.Set<UsuariosPermisosUsuario>()
                    .Include(x => x.IdModuloNavigation)
                    .Include(x => x.IdPermisoNavigation)
                    .Where(x => x.IdUsuario == idUsuario)
                    .ToListAsync();
            }
            catch
            {
                return new List<UsuariosPermisosUsuario>();
            }
        }

        public async Task<UsuariosPermisosUsuario?> ObtenerPermisoUsuario(
            int idUsuario,
            int idModulo,
            int idPermiso)
        {
            try
            {
                return await _db.Set<UsuariosPermisosUsuario>()
                    .FirstOrDefaultAsync(x =>
                        x.IdUsuario == idUsuario &&
                        x.IdModulo == idModulo &&
                        x.IdPermiso == idPermiso);
            }
            catch
            {
                return null;
            }
        }

        public async Task<List<UsuariosPermisosUsuario>> ObtenerPermisosUsuarioPorModulos(
            int idUsuario,
            List<int> idsModulos)
        {
            try
            {
                if (idsModulos == null || idsModulos.Count == 0)
                    return new List<UsuariosPermisosUsuario>();

                return await _db.Set<UsuariosPermisosUsuario>()
                    .Include(x => x.IdModuloNavigation)
                    .Include(x => x.IdPermisoNavigation)
                    .Where(x => x.IdUsuario == idUsuario && idsModulos.Contains(x.IdModulo))
                    .ToListAsync();
            }
            catch
            {
                return new List<UsuariosPermisosUsuario>();
            }
        }

        public async Task<List<UsuariosRolesPermiso>> ObtenerPermisosRolActivo(int idRol)
        {
            try
            {
                return await _db.Set<UsuariosRolesPermiso>()
                    .Include(x => x.IdModuloNavigation)
                    .Include(x => x.IdPermisoNavigation)
                    .Where(x => x.IdRol == idRol && x.Activo == true)
                    .ToListAsync();
            }
            catch
            {
                return new List<UsuariosRolesPermiso>();
            }
        }

        public async Task RegistrarPermisoUsuario(UsuariosPermisosUsuario entity)
        {
            await _db.Set<UsuariosPermisosUsuario>().AddAsync(entity);
        }

        public async Task RegistrarPermisosUsuario(List<UsuariosPermisosUsuario> entities)
        {
            await _db.Set<UsuariosPermisosUsuario>().AddRangeAsync(entities);
        }

        public void ActualizarPermisoUsuario(UsuariosPermisosUsuario entity)
        {
            _db.Set<UsuariosPermisosUsuario>().Update(entity);
        }

        public async Task<bool> SaveChanges()
        {
            try
            {
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}