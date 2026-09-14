using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosRepository : IUsuariosRepository<User>
    {

        private readonly SistemaOroAmbientalContext _dbcontext;

        public UsuariosRepository(SistemaOroAmbientalContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(User model)
        {
            try
            {
                _dbcontext.Usuarios.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                User model = _dbcontext.Usuarios.First(c => c.Id == id);
                _dbcontext.Usuarios.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Insertar(User model)
        {
            try
            {
                _dbcontext.Usuarios.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<User> Obtener(int id)
        {
            try
            {
                User model = await _dbcontext.Usuarios.FindAsync(id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<User> ObtenerUsuario(string usuario)
        {
            try
            {
                User model = await _dbcontext.Usuarios
                    .AsNoTracking()
                    .Where(x => x.Usuario.ToUpper() == usuario.ToUpper())
                    .FirstOrDefaultAsync();
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<IQueryable<User>> ObtenerTodos(bool soloActivos = false)
        {
            try
            {
                IQueryable<User> query = _dbcontext.Usuarios
                    .AsNoTracking()
                    .Include(c => c.IdEstadoNavigation)
                    .Include(c => c.IdRolNavigation)
                    .AsQueryable();

                if (soloActivos)
                    query = query.Where(x => x.Activo);

                return await Task.FromResult(query);
            }
            catch (Exception)
            {
                return Enumerable.Empty<User>().AsQueryable();
            }
        }

        public async Task<GrillaPaginadaResult<User>> ListarPaginado(GrillaPaginadaConsulta consulta)
        {
            consulta ??= new GrillaPaginadaConsulta();
            var take = Math.Clamp(consulta.Length, 1, 200);

            var baseQuery = _dbcontext.Usuarios.AsNoTracking();
            var total = await baseQuery.CountAsync();

            var query = AplicarFiltrosUsuarios(baseQuery, consulta);
            var filtered = await query.CountAsync();

            query = AplicarOrdenUsuarios(query, consulta.SortColumn, consulta.SortDesc);

            var items = await query
                .AsSplitQuery()
                .Include(c => c.IdEstadoNavigation)
                .Include(c => c.IdRolNavigation)
                .Skip(consulta.Start)
                .Take(take)
                .ToListAsync();

            return new GrillaPaginadaResult<User>
            {
                Total = total,
                Filtered = filtered,
                Items = items
            };
        }

        public async Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta)
        {
            consulta ??= new GrillaPaginadaConsulta();
            var query = AplicarFiltrosUsuarios(_dbcontext.Usuarios.AsNoTracking(), consulta);
            query = AplicarOrdenUsuarios(query, consulta.SortColumn, consulta.SortDesc);
            var ids = await query.Select(x => x.Id).ToListAsync();
            return ids.FindIndex(x => x == id);
        }

        private static IQueryable<User> AplicarFiltrosUsuarios(IQueryable<User> query, GrillaPaginadaConsulta consulta)
        {
            if (string.Equals(consulta.ActivoModo, "activos", StringComparison.OrdinalIgnoreCase))
                query = query.Where(x => x.Activo);
            else if (string.Equals(consulta.ActivoModo, "inactivos", StringComparison.OrdinalIgnoreCase))
                query = query.Where(x => !x.Activo);

            if (!string.IsNullOrWhiteSpace(consulta.Search))
            {
                var s = consulta.Search.Trim();
                query = query.Where(u =>
                    u.Usuario.Contains(s) ||
                    u.Nombre.Contains(s) ||
                    u.Apellido.Contains(s) ||
                    (u.Correo != null && u.Correo.Contains(s)) ||
                    (u.Dni != null && u.Dni.Contains(s)) ||
                    u.Id.ToString().Contains(s));
            }

            if (consulta.Filters == null)
                return query;

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Id", out var idTxt) && int.TryParse(idTxt, out var idF))
                query = query.Where(x => x.Id == idF);

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Usuario", out var usuario))
                query = query.Where(x => x.Usuario.Contains(usuario));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Nombre", out var nombre))
                query = query.Where(x => x.Nombre.Contains(nombre));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Apellido", out var apellido))
                query = query.Where(x => x.Apellido.Contains(apellido));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Dni", out var dni))
                query = query.Where(x => x.Dni != null && x.Dni.Contains(dni));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Telefono", out var tel))
                query = query.Where(x => x.Telefono != null && x.Telefono.Contains(tel));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Direccion", out var dir))
                query = query.Where(x => x.Direccion != null && x.Direccion.Contains(dir));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Correo", out var correo))
                query = query.Where(x => x.Correo != null && x.Correo.Contains(correo));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "UsuariosRol", out var rol))
                query = query.Where(x => x.IdRolNavigation != null && x.IdRolNavigation.Nombre.Contains(rol));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Estado", out var estado))
                query = query.Where(x => x.IdEstadoNavigation != null && x.IdEstadoNavigation.Nombre.Contains(estado));

            return query;
        }

        private static IQueryable<User> AplicarOrdenUsuarios(IQueryable<User> query, string? sortColumn, bool desc)
        {
            return (sortColumn ?? "").ToLowerInvariant() switch
            {
                "usuario" => desc ? query.OrderByDescending(x => x.Usuario) : query.OrderBy(x => x.Usuario),
                "nombre" => desc ? query.OrderByDescending(x => x.Nombre) : query.OrderBy(x => x.Nombre),
                "apellido" => desc ? query.OrderByDescending(x => x.Apellido) : query.OrderBy(x => x.Apellido),
                "dni" => desc ? query.OrderByDescending(x => x.Dni) : query.OrderBy(x => x.Dni),
                "telefono" => desc ? query.OrderByDescending(x => x.Telefono) : query.OrderBy(x => x.Telefono),
                "direccion" => desc ? query.OrderByDescending(x => x.Direccion) : query.OrderBy(x => x.Direccion),
                "correo" => desc ? query.OrderByDescending(x => x.Correo) : query.OrderBy(x => x.Correo),
                "usuariosrol" => desc
                    ? query.OrderByDescending(x => x.IdRolNavigation!.Nombre)
                    : query.OrderBy(x => x.IdRolNavigation!.Nombre),
                "estado" => desc
                    ? query.OrderByDescending(x => x.IdEstadoNavigation!.Nombre)
                    : query.OrderBy(x => x.IdEstadoNavigation!.Nombre),
                _ => desc ? query.OrderByDescending(x => x.Id) : query.OrderBy(x => x.Id)
            };
        }

        public async Task<bool> CambiarActivo(int id, bool activo)
        {
            var entity = await _dbcontext.Usuarios.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.Activo = activo;
            if (!activo)
                entity.IdEstado = 2;
            else if (entity.IdEstado == 2)
                entity.IdEstado = 1;

            await _dbcontext.SaveChangesAsync();
            return true;
        }




    }
}
