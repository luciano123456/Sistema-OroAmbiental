using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesRepository : IClientesRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(Cliente model)
        {
            try
            {
                _db.Clientes.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(Cliente model)
        {
            try
            {
                var entity = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.IdSucursal = model.IdSucursal;
                entity.Nombre = model.Nombre;
                entity.Telefono = model.Telefono;
                entity.TelefonoAlt = model.TelefonoAlt;
                entity.Cuit = model.Cuit;
                entity.Domicilio = model.Domicilio;
                entity.IdProvincia = model.IdProvincia;
                entity.Localidad = model.Localidad;
                entity.CodPostal = model.CodPostal;
                entity.IdCondicionIva = model.IdCondicionIva;
                entity.Email = model.Email;
                entity.IdProfesion = model.IdProfesion;
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

        public async Task<Cliente?> BuscarDuplicado(int? idExcluir, string? nombre, string? cuit)
        {
            var query = _db.Clientes.AsQueryable();

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
                var cliente = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == id);
                if (cliente == null)
                    return false;

                _db.Clientes.Remove(cliente);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<Cliente?> Obtener(int id)
        {
            return await _db.Clientes
                .AsNoTracking()
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            var query = _db.Clientes
                .AsNoTracking()
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation);

            return await Task.FromResult(query);
        }
    }
}
