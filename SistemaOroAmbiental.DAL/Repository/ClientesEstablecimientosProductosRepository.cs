using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesEstablecimientosProductosRepository : IClientesEstablecimientosProductosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesEstablecimientosProductosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<ClientesEstablecimientosProducto>> ObtenerPorEstablecimiento(int idEstablecimiento)
            => await _db.ClientesEstablecimientosProductos
                .AsNoTracking()
                .Include(x => x.IdProductoNavigation)
                .Where(x => x.IdEstablecimiento == idEstablecimiento)
                .OrderBy(x => x.IdProductoNavigation.Nombre)
                .ToListAsync();

        public async Task<ClientesEstablecimientosProducto?> Obtener(int id)
            => await _db.ClientesEstablecimientosProductos
                .AsNoTracking()
                .Include(x => x.IdProductoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<ClientesEstablecimientosProducto?> BuscarDuplicado(int? idExcluir, int idEstablecimiento, int idProducto)
        {
            var query = _db.ClientesEstablecimientosProductos
                .AsNoTracking()
                .Where(x => x.IdEstablecimiento == idEstablecimiento && x.IdProducto == idProducto);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<bool> Insertar(ClientesEstablecimientosProducto model)
        {
            try
            {
                _db.ClientesEstablecimientosProductos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException) { throw; }
        }

        public async Task<bool> Actualizar(ClientesEstablecimientosProducto model)
        {
            try
            {
                var entity = await _db.ClientesEstablecimientosProductos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null) return false;

                entity.IdProducto = model.IdProducto;
                entity.Cantidad = model.Cantidad;
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
                var model = await _db.ClientesEstablecimientosProductos.FindAsync(id);
                if (model == null) return false;
                _db.ClientesEstablecimientosProductos.Remove(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException) { throw; }
        }
    }
}
