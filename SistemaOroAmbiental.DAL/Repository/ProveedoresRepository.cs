using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ProveedoresRepository : IProveedoresRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ProveedoresRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(Proveedore model)
        {
            try
            {
                _db.Proveedores.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(Proveedore model)
        {
            try
            {
                var entity = await _db.Proveedores.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.Nombre = model.Nombre;
                entity.Telefono = model.Telefono;
                entity.Email = model.Email;
                entity.IdCondicionIva = model.IdCondicionIva;
                entity.Cuit = model.Cuit;
                entity.IdBanco = model.IdBanco;
                entity.AliasBancario = model.AliasBancario;
                entity.CbuBancario = model.CbuBancario;
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

        public async Task<Proveedore?> BuscarDuplicado(int? idExcluir, string? nombre, string? cuit)
        {
            var query = _db.Proveedores.AsQueryable();

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            if (!string.IsNullOrWhiteSpace(cuit))
            {
                var dup = await query.FirstOrDefaultAsync(x => x.Cuit == cuit);
                if (dup != null)
                    return dup;
            }

            if (!string.IsNullOrWhiteSpace(nombre))
            {
                var dup = await query.FirstOrDefaultAsync(x => x.Nombre == nombre);
                if (dup != null)
                    return dup;
            }

            return null;
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                var entity = await _db.Proveedores.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return false;

                _db.Proveedores.Remove(entity);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<Proveedore?> Obtener(int id)
        {
            return await _db.Proveedores
                .AsNoTracking()
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdBancoNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<Proveedore>> ObtenerTodos()
        {
            var query = _db.Proveedores
                .AsNoTracking()
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdBancoNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation);

            return await Task.FromResult(query);
        }
    }
}
