using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class UsuariosSucursalesRepository : IUsuariosSucursalesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public UsuariosSucursalesRepository(SistemaOroAmbientalContext db)
        {
            _db = db;
        }

        public async Task<List<int>> ObtenerIdsSucursales(int idUsuario)
        {
            return await _db.UsuariosSucursales
                .AsNoTracking()
                .Where(x => x.IdUsuario == idUsuario)
                .Select(x => x.IdSucursal)
                .ToListAsync();
        }

        public async Task<List<SucursalListaItem>> ListaAsignadas(int idUsuario)
        {
            return await _db.UsuariosSucursales
                .AsNoTracking()
                .Where(x => x.IdUsuario == idUsuario)
                .Select(x => new SucursalListaItem
                {
                    Id = x.IdSucursal,
                    Nombre = x.IdSucursalNavigation.Nombre
                })
                .OrderBy(x => x.Nombre)
                .ToListAsync();
        }

        public async Task<List<SucursalListaItem>> ListaParaUsuario(int idUsuario)
        {
            var ids = await ObtenerIdsSucursales(idUsuario);

            if (ids.Count == 0)
                return new List<SucursalListaItem>();

            return await _db.Sucursales
                .AsNoTracking()
                .Where(x => ids.Contains(x.Id))
                .OrderBy(x => x.Nombre)
                .Select(x => new SucursalListaItem { Id = x.Id, Nombre = x.Nombre })
                .ToListAsync();
        }

        public async Task<bool> ActualizarMasivo(int idUsuario, IEnumerable<int> idsSucursales)
        {
            var ids = (idsSucursales ?? Array.Empty<int>()).Distinct().Where(x => x > 0).ToList();

            var actuales = await _db.UsuariosSucursales
                .Where(x => x.IdUsuario == idUsuario)
                .ToListAsync();

            if (actuales.Count > 0)
                _db.UsuariosSucursales.RemoveRange(actuales);

            foreach (var idSucursal in ids)
            {
                _db.UsuariosSucursales.Add(new UsuariosSucursal
                {
                    IdUsuario = idUsuario,
                    IdSucursal = idSucursal
                });
            }

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
