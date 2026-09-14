using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ChoferesRepository : IChoferesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ChoferesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(Chofer model)
        {
            _db.Choferes.Add(model);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Chofer model)
        {
            var entity = await _db.Choferes.FirstOrDefaultAsync(x => x.Id == model.Id);
            if (entity == null)
                return false;

            entity.Nombre = model.Nombre;
            entity.Dni = model.Dni;
            entity.FirmaArchivo = model.FirmaArchivo;
            entity.Activo = model.Activo;
            entity.IdUsuarioModifica = model.IdUsuarioModifica;
            entity.FechaUsuarioModifica = model.FechaUsuarioModifica;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            var entity = await _db.Choferes.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            _db.Choferes.Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<Chofer?> Obtener(int id)
        {
            return await _db.Choferes
                .AsNoTracking()
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public Task<IQueryable<Chofer>> ObtenerTodos(bool soloActivos = false)
        {
            var query = _db.Choferes
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
            var entity = await _db.Choferes.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.Activo = activo;
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
