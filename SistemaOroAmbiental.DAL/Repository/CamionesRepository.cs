using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class CamionesRepository : ICamionesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public CamionesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(Camion model)
        {
            try
            {
                _db.Camiones.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(Camion model)
        {
            try
            {
                var entity = await _db.Camiones.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.Nombre = model.Nombre;
                entity.Activo = model.Activo;
                entity.IdUsuarioModifica = model.IdUsuarioModifica;
                entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                var entity = await _db.Camiones.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return false;

                _db.Camiones.Remove(entity);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException)
            {
                throw;
            }
        }

        public async Task<Camion?> Obtener(int id)
        {
            return await _db.Camiones
                .AsNoTracking()
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<Camion>> ObtenerTodos(bool soloActivos = false)
        {
            var query = _db.Camiones
                .AsNoTracking()
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .AsQueryable();

            if (soloActivos)
                query = query.Where(x => x.Activo);

            return await Task.FromResult(query);
        }

        public async Task<bool> CambiarActivo(int id, bool activo)
        {
            var entity = await _db.Camiones.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.Activo = activo;
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
