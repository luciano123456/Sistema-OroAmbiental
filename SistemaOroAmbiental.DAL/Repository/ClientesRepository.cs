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
                await AsignarNumeroCliente(model);
                _db.Clientes.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task AsignarNumeroCliente(Cliente model)
        {
            if (model.NumeroCliente.HasValue)
                return;

            var max = await _db.Clientes.MaxAsync(c => (int?)c.NumeroCliente) ?? 0;
            model.NumeroCliente = max + 1;
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
                entity.Calle = model.Calle;
                entity.Numero = model.Numero;
                entity.PisoDepartamento = model.PisoDepartamento;
                entity.Domicilio = model.Domicilio;
                entity.IdTipoGenerador = model.IdTipoGenerador;
                entity.IdProvincia = model.IdProvincia;
                entity.Localidad = model.Localidad;
                entity.CodPostal = model.CodPostal;
                entity.IdCondicionIva = model.IdCondicionIva;
                entity.Email = model.Email;
                entity.IdProfesion = model.IdProfesion;
                entity.Activo = model.Activo;
                entity.IdEstado = model.IdEstado;
                entity.IdMotivo = model.IdMotivo;
                entity.MotivoDetalle = model.MotivoDetalle;
                entity.IdCalificacion = model.IdCalificacion;
                entity.IdLocalidad = model.IdLocalidad;
                entity.IdPartido = model.IdPartido;
                entity.NumeroCliente = model.NumeroCliente;
                entity.FechaInicio = model.FechaInicio;
                entity.FechaLicenciaDesde = model.FechaLicenciaDesde;
                entity.FechaLicenciaHasta = model.FechaLicenciaHasta;
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
            catch (DbUpdateException)
            {
                throw;
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
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdPartidoNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<Cliente>> ObtenerTodos(bool soloActivos = false)
        {
            var query = _db.Clientes
                .AsNoTracking()
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdPartidoNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .AsQueryable();

            if (soloActivos)
                query = query.Where(x => x.Activo);

            return await Task.FromResult(query);
        }

        public async Task<bool> CambiarActivo(int id, bool activo)
        {
            var entity = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.Activo = activo;
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
