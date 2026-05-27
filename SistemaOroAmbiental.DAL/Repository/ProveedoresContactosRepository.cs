using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProveedoresContactosRepository : IProveedoresContactosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProveedoresContactosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<ProveedoresContacto>> ObtenerPorProveedor(int idProveedor)
            => await _db.ProveedoresContactos
                .AsNoTracking()
                .Where(x => x.IdProveedor == idProveedor)
                .OrderBy(x => x.Nombre)
                .ToListAsync();

        public async Task<ProveedoresContacto?> Obtener(int id)
            => await _db.ProveedoresContactos
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<ProveedoresContacto?> BuscarDuplicado(int? idExcluir, int idProveedor, string nombre)
        {
            var query = _db.ProveedoresContactos
                .AsNoTracking()
                .Where(x => x.IdProveedor == idProveedor && x.Nombre == nombre);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<bool> Insertar(ProveedoresContacto model)
        {
            try
            {
                _db.ProveedoresContactos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(ProveedoresContacto model)
        {
            try
            {
                var entity = await _db.ProveedoresContactos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.Nombre = model.Nombre;
                entity.Puesto = model.Puesto;
                entity.Telefono = model.Telefono;
                entity.TelefonoAlt = model.TelefonoAlt;
                entity.Email = model.Email;
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
                var model = await _db.ProveedoresContactos.FindAsync(id);
                if (model == null) return false;
                _db.ProveedoresContactos.Remove(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException)
            {
                throw;
            }
        }
    }
}
