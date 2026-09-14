using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
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
                entity.CodPostal = model.CodPostal;
                entity.IdCondicionIva = model.IdCondicionIva;
                entity.Email = model.Email;
                entity.IdProfesion = model.IdProfesion;
                entity.Activo = model.Activo;
                entity.IdEstado = model.IdEstado;
                entity.IdMotivo = model.IdMotivo;
                entity.MotivoDetalle = model.MotivoDetalle;
                entity.IdCalificacion = model.IdCalificacion;
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
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<Cliente>> ObtenerTodos(bool soloActivos = false)
        {
            var query = _db.Clientes
                .AsNoTracking()
                .AsSplitQuery()
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .AsQueryable();

            if (soloActivos)
                query = query.Where(x => x.Activo);

            return await Task.FromResult(query);
        }

        public async Task<GrillaPaginadaResult<Cliente>> ListarPaginado(GrillaPaginadaConsulta consulta)
        {
            consulta ??= new GrillaPaginadaConsulta();
            var take = Math.Clamp(consulta.Length, 1, 200);

            var baseQuery = _db.Clientes.AsNoTracking();
            var total = await baseQuery.CountAsync();

            var query = AplicarFiltrosClientes(baseQuery, consulta);
            var filtered = await query.CountAsync();

            query = AplicarOrdenClientes(query, consulta.SortColumn, consulta.SortDesc);

            var items = await query
                .AsSplitQuery()
                .Include(x => x.IdSucursalNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .Skip(consulta.Start)
                .Take(take)
                .ToListAsync();

            return new GrillaPaginadaResult<Cliente>
            {
                Total = total,
                Filtered = filtered,
                Items = items
            };
        }

        public async Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta)
        {
            consulta ??= new GrillaPaginadaConsulta();
            var query = AplicarFiltrosClientes(_db.Clientes.AsNoTracking(), consulta);
            query = AplicarOrdenClientes(query, consulta.SortColumn, consulta.SortDesc);

            var ids = await query.Select(x => x.Id).ToListAsync();
            return ids.FindIndex(x => x == id);
        }

        private static IQueryable<Cliente> AplicarFiltrosClientes(IQueryable<Cliente> query, GrillaPaginadaConsulta consulta)
        {
            if (string.Equals(consulta.ActivoModo, "activos", StringComparison.OrdinalIgnoreCase))
                query = query.Where(x => x.Activo);
            else if (string.Equals(consulta.ActivoModo, "inactivos", StringComparison.OrdinalIgnoreCase))
                query = query.Where(x => !x.Activo);

            if (!string.IsNullOrWhiteSpace(consulta.Search))
            {
                var s = consulta.Search.Trim();
                if (int.TryParse(s, out var nro))
                {
                    query = query.Where(c =>
                        c.Nombre.Contains(s) ||
                        (c.Cuit != null && c.Cuit.Contains(s)) ||
                        c.NumeroCliente == nro ||
                        c.Id.ToString().Contains(s));
                }
                else
                {
                    query = query.Where(c =>
                        c.Nombre.Contains(s) ||
                        (c.Cuit != null && c.Cuit.Contains(s)) ||
                        (c.Email != null && c.Email.Contains(s)) ||
                        (c.Telefono != null && c.Telefono.Contains(s)));
                }
            }

            if (consulta.Filters == null)
                return query;

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Id", out var idTxt) && int.TryParse(idTxt, out var idF))
                query = query.Where(x => x.Id == idF);

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Nombre", out var nombre))
                query = query.Where(x => x.Nombre.Contains(nombre));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Cuit", out var cuit))
                query = query.Where(x => x.Cuit != null && x.Cuit.Contains(cuit));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Sucursal", out var sucursal))
                query = query.Where(x => x.IdSucursalNavigation != null && x.IdSucursalNavigation.Nombre.Contains(sucursal));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Provincia", out var provincia))
                query = query.Where(x => x.IdProvinciaNavigation != null && x.IdProvinciaNavigation.Nombre.Contains(provincia));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Profesion", out var profesion))
                query = query.Where(x => x.IdProfesionNavigation != null && x.IdProfesionNavigation.Nombre.Contains(profesion));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "CondicionIva", out var iva))
                query = query.Where(x => x.IdCondicionIvaNavigation != null && x.IdCondicionIvaNavigation.Nombre.Contains(iva));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Telefono", out var tel))
                query = query.Where(x => x.Telefono != null && x.Telefono.Contains(tel));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Email", out var email))
                query = query.Where(x => x.Email != null && x.Email.Contains(email));

            return query;
        }

        private static IQueryable<Cliente> AplicarOrdenClientes(IQueryable<Cliente> query, string? sortColumn, bool desc)
        {
            return (sortColumn ?? "").ToLowerInvariant() switch
            {
                "nombre" => desc ? query.OrderByDescending(x => x.Nombre) : query.OrderBy(x => x.Nombre),
                "cuit" => desc ? query.OrderByDescending(x => x.Cuit) : query.OrderBy(x => x.Cuit),
                "sucursal" => desc
                    ? query.OrderByDescending(x => x.IdSucursalNavigation!.Nombre)
                    : query.OrderBy(x => x.IdSucursalNavigation!.Nombre),
                "provincia" => desc
                    ? query.OrderByDescending(x => x.IdProvinciaNavigation!.Nombre)
                    : query.OrderBy(x => x.IdProvinciaNavigation!.Nombre),
                "profesion" => desc
                    ? query.OrderByDescending(x => x.IdProfesionNavigation!.Nombre)
                    : query.OrderBy(x => x.IdProfesionNavigation!.Nombre),
                "condicioniva" => desc
                    ? query.OrderByDescending(x => x.IdCondicionIvaNavigation!.Nombre)
                    : query.OrderBy(x => x.IdCondicionIvaNavigation!.Nombre),
                "telefono" => desc ? query.OrderByDescending(x => x.Telefono) : query.OrderBy(x => x.Telefono),
                "email" => desc ? query.OrderByDescending(x => x.Email) : query.OrderBy(x => x.Email),
                "activo" => desc ? query.OrderByDescending(x => x.Activo) : query.OrderBy(x => x.Activo),
                _ => desc ? query.OrderByDescending(x => x.Id) : query.OrderBy(x => x.Id)
            };
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
