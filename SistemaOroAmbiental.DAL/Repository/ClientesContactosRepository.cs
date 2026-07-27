using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesContactosRepository : IClientesContactosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesContactosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<ClientesContacto>> ObtenerPorCliente(int idCliente)
            => await _db.ClientesContactos
                .AsNoTracking()
                .Where(x => x.IdCliente == idCliente)
                .OrderBy(x => x.Nombre)
                .ToListAsync();

        public async Task<ClientesContacto?> Obtener(int id)
            => await _db.ClientesContactos
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<ClientesContacto?> BuscarDuplicado(int? idExcluir, int idCliente, string nombre)
        {
            var query = _db.ClientesContactos
                .AsNoTracking()
                .Where(x => x.IdCliente == idCliente && x.Nombre == nombre);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<bool> Insertar(ClientesContacto model)
        {
            try
            {
                _db.ClientesContactos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(ClientesContacto model)
        {
            try
            {
                var entity = await _db.ClientesContactos.FirstOrDefaultAsync(x => x.Id == model.Id);
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
                var model = await _db.ClientesContactos.FindAsync(id);
                if (model == null) return false;
                _db.ClientesContactos.Remove(model);
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
