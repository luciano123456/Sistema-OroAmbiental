using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class FirmasRepository : IFirmasRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public FirmasRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(Firma model)
        {
            _db.Firmas.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Firma model)
        {
            var entity = await _db.Firmas.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null)
                return false;

            entity.Nombre = model.Nombre;
            entity.FirmaArchivo = model.FirmaArchivo;
            entity.Activo = model.Activo;
            entity.IdUsuarioModifica = model.IdUsuarioModifica;
            entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var entity = await _db.Firmas.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            _db.Firmas.Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Firma?> Obtener(int id)
        {
            return await _db.Firmas
                .AsNoTracking()
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public Task<IQueryable<Firma>> ObtenerTodos(bool soloActivos = false)
        {
            var query = _db.Firmas
                .AsNoTracking()
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .AsQueryable();

            if (soloActivos)
                query = query.Where(x => x.Activo);

            return Task.FromResult(query);
        }

        public async Task<bool> CambiarActivo(int id, bool activo)
        {
            var entity = await _db.Firmas.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.Activo = activo;
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
