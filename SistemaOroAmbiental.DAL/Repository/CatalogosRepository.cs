using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class CatalogosRepository : ICatalogosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public CatalogosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public Task<List<Provincia>> ObtenerProvincias()
            => _db.Provincias.AsNoTracking().OrderBy(x => x.Nombre).ToListAsync();

        public Task<List<CondicionesIva>> ObtenerCondicionesIva()
            => _db.CondicionesIvas.AsNoTracking().OrderBy(x => x.Nombre).ToListAsync();

        public Task<List<Sucursal>> ObtenerSucursales()
            => _db.Sucursales.AsNoTracking().OrderBy(x => x.Nombre).ToListAsync();
    }
}
