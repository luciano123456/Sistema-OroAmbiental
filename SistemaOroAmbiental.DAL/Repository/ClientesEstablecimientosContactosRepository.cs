using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesEstablecimientosContactosRepository : IClientesEstablecimientosContactosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesEstablecimientosContactosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<ClientesEstablecimientosContacto>> ObtenerPorEstablecimiento(int idEstablecimiento)
            => await _db.ClientesEstablecimientosContactos
                .AsNoTracking()
                .Where(x => x.IdEstablecimiento == idEstablecimiento)
                .OrderBy(x => x.Nombre)
                .ToListAsync();

        public async Task<ClientesEstablecimientosContacto?> Obtener(int id)
            => await _db.ClientesEstablecimientosContactos
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<ClientesEstablecimientosContacto?> BuscarDuplicado(int? idExcluir, int idEstablecimiento, string nombre)
        {
            var query = _db.ClientesEstablecimientosContactos
                .AsNoTracking()
                .Where(x => x.IdEstablecimiento == idEstablecimiento && x.Nombre == nombre);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<bool> Insertar(ClientesEstablecimientosContacto model)
        {
            try
            {
                _db.ClientesEstablecimientosContactos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException) { throw; }
        }

        public async Task<bool> Actualizar(ClientesEstablecimientosContacto model)
        {
            try
            {
                var entity = await _db.ClientesEstablecimientosContactos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null) return false;

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
            catch (DbUpdateException) { throw; }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                var model = await _db.ClientesEstablecimientosContactos.FindAsync(id);
                if (model == null) return false;
                _db.ClientesEstablecimientosContactos.Remove(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException) { throw; }
        }
    }
}
