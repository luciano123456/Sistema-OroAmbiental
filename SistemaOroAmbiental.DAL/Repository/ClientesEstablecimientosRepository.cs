using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesEstablecimientosRepository : IClientesEstablecimientosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public ClientesEstablecimientosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<bool> Insertar(ClientesEstablecimiento model)
        {
            try
            {
                _db.ClientesEstablecimientos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> Actualizar(ClientesEstablecimiento model)
        {
            try
            {
                var entity = await _db.ClientesEstablecimientos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null) return false;

                entity.IdCliente = model.IdCliente;
                entity.Nombre = model.Nombre;
                entity.Cuit = model.Cuit;
                entity.IdCondicionIva = model.IdCondicionIva;
                entity.Domicilio = model.Domicilio;
                entity.IdProvincia = model.IdProvincia;
                entity.Localidad = model.Localidad;
                entity.CodPostal = model.CodPostal;
                entity.ImpuestoIva = model.ImpuestoIva;
                entity.IdDiaRecoleccion = model.IdDiaRecoleccion;
                entity.IdSemanaRecoleccion = model.IdSemanaRecoleccion;
                entity.IdListaPrecio = model.IdListaPrecio;
                entity.HorarioRecoleccionDesde = model.HorarioRecoleccionDesde;
                entity.HorarioRecoleccionHasta = model.HorarioRecoleccionHasta;
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

        public async Task<bool> TieneContratos(int id)
            => await _db.Contratos.AnyAsync(x => x.IdEstablecimiento == id);

        public async Task<bool> Eliminar(int id)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var est = await _db.ClientesEstablecimientos.FirstOrDefaultAsync(x => x.Id == id);
                if (est == null) return false;

                if (await _db.Contratos.AnyAsync(x => x.IdEstablecimiento == id))
                    throw new InvalidOperationException("CONTRATOS");

                var dias = await _db.ClientesEstablecimientosDias
                    .Where(x => x.IdEstablecimiento == id)
                    .Select(x => x.Id)
                    .ToListAsync();

                if (dias.Count > 0)
                {
                    var horarios = await _db.ClientesEstablecimientosDiasHorarios
                        .Where(x => dias.Contains(x.IdEstablecimientoDia))
                        .ToListAsync();
                    _db.ClientesEstablecimientosDiasHorarios.RemoveRange(horarios);
                }

                var diasEnt = await _db.ClientesEstablecimientosDias
                    .Where(x => x.IdEstablecimiento == id)
                    .ToListAsync();
                _db.ClientesEstablecimientosDias.RemoveRange(diasEnt);

                var excepciones = await _db.ClientesEstablecimientosExcepciones
                    .Where(x => x.IdEstablecimiento == id)
                    .ToListAsync();
                _db.ClientesEstablecimientosExcepciones.RemoveRange(excepciones);

                var productos = await _db.ClientesEstablecimientosProductos
                    .Where(x => x.IdEstablecimiento == id)
                    .ToListAsync();
                _db.ClientesEstablecimientosProductos.RemoveRange(productos);

                var contactos = await _db.ClientesEstablecimientosContactos
                    .Where(x => x.IdEstablecimiento == id)
                    .ToListAsync();
                _db.ClientesEstablecimientosContactos.RemoveRange(contactos);

                _db.ClientesEstablecimientos.Remove(est);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<ClientesEstablecimiento?> Obtener(int id)
        {
            return await _db.ClientesEstablecimientos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdDiaRecoleccionNavigation)
                .Include(x => x.IdSemanaRecoleccionNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .Include(x => x.IdCamionNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos()
        {
            return _db.ClientesEstablecimientos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdDiaRecoleccionNavigation)
                .Include(x => x.IdSemanaRecoleccionNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .Include(x => x.IdCamionNavigation)
                .OrderBy(x => x.Nombre);
        }

        public async Task<ClientesEstablecimiento?> BuscarDuplicado(int? idExcluir, int idCliente, string nombre)
        {
            var query = _db.ClientesEstablecimientos
                .AsNoTracking()
                .Where(x => x.IdCliente == idCliente && x.Nombre == nombre);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }
    }
}
