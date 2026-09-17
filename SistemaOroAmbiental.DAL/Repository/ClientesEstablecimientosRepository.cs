using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
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
                model.OrdenRecorrido = model.OrdenRecorrido is > 0 ? model.OrdenRecorrido : null;
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
                entity.Calle = model.Calle;
                entity.Descripcion = string.IsNullOrWhiteSpace(model.Descripcion) ? null : model.Descripcion.Trim();
                entity.Numero = model.Numero;
                entity.PisoDepartamento = model.PisoDepartamento;
                entity.Domicilio = model.Domicilio;
                entity.IdTipoGenerador = model.IdTipoGenerador;
                entity.IdActividad = model.IdActividad;
                entity.IdProvincia = model.IdProvincia;
                entity.IdPartido = model.IdPartido;
                entity.IdLocalidad = model.IdLocalidad;
                entity.Localidad = model.Localidad;
                entity.CodPostal = model.CodPostal;
                entity.ImpuestoIva = model.ImpuestoIva;
                entity.IdEstado = model.IdEstado;
                entity.IdMotivo = model.IdMotivo;
                entity.MotivoDetalle = string.IsNullOrWhiteSpace(model.MotivoDetalle) ? null : model.MotivoDetalle.Trim();
                entity.IdCalificacion = model.IdCalificacion;
                entity.FechaInicio = model.FechaInicio;
                entity.FechaLicenciaDesde = model.FechaLicenciaDesde;
                entity.FechaLicenciaHasta = model.FechaLicenciaHasta;
                entity.IdDiaRecoleccion = model.IdDiaRecoleccion is > 0 ? model.IdDiaRecoleccion : null;
                entity.IdSemanaRecoleccion = model.IdSemanaRecoleccion is > 0 ? model.IdSemanaRecoleccion : null;
                entity.IdListaPrecio = model.IdListaPrecio;
                entity.IdCamion = model.IdCamion;
                entity.OrdenRecorrido = model.OrdenRecorrido is > 0 ? model.OrdenRecorrido : null;
                entity.Kilos = model.Kilos;
                entity.HorarioRecoleccionDesde = model.HorarioRecoleccionDesde;
                entity.HorarioRecoleccionHasta = model.HorarioRecoleccionHasta;
                entity.DiasHorarios = string.IsNullOrWhiteSpace(model.DiasHorarios) ? null : model.DiasHorarios.Trim();
                entity.IdEstablecimientoCliente = string.IsNullOrWhiteSpace(model.IdEstablecimientoCliente)
                    ? null
                    : model.IdEstablecimientoCliente.Trim();
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

        public Task<bool> Eliminar(int id)
            => _db.ExecuteInTransactionAsync(() => EliminarSinTransaccion(id));

        public async Task<bool> EliminarSinTransaccion(int id)
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

            var recorridos = await _db.ClientesRecorridos
                .Where(x => x.IdEstablecimiento == id)
                .ToListAsync();
            _db.ClientesRecorridos.RemoveRange(recorridos);

            _db.ClientesEstablecimientos.Remove(est);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<ClientesEstablecimiento?> Obtener(int id)
        {
            return await _db.ClientesEstablecimientos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdActividadNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdDiaRecoleccionNavigation)
                .Include(x => x.IdSemanaRecoleccionNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .Include(x => x.IdCamionNavigation)
                .Include(x => x.IdPartidoNavigation)
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos()
        {
            return _db.ClientesEstablecimientos
                .AsNoTracking()
                .AsSplitQuery()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdActividadNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdDiaRecoleccionNavigation)
                .Include(x => x.IdSemanaRecoleccionNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .Include(x => x.IdCamionNavigation)
                .Include(x => x.IdPartidoNavigation)
                .Include(x => x.IdLocalidadNavigation)
                .OrderBy(x => x.Nombre);
        }

        public async Task<List<ClientesEstablecimiento>> ListarPorCliente(int idCliente)
        {
            return await _db.ClientesEstablecimientos
                .AsNoTracking()
                .Where(x => x.IdCliente == idCliente)
                .OrderBy(x => x.Nombre)
                .ToListAsync();
        }

        public async Task<GrillaPaginadaResult<ClientesEstablecimiento>> ListarPaginado(GrillaPaginadaConsulta consulta)
        {
            consulta ??= new GrillaPaginadaConsulta();
            var take = Math.Clamp(consulta.Length, 1, 200);

            var baseQuery = _db.ClientesEstablecimientos.AsNoTracking();
            var total = await baseQuery.CountAsync();

            var query = AplicarFiltrosEstablecimientos(baseQuery, consulta);
            var filtered = await query.CountAsync();

            query = AplicarOrdenEstablecimientos(query, consulta.SortColumn, consulta.SortDesc);

            var items = await query
                .AsSplitQuery()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdProvinciaNavigation)
                .Include(x => x.IdPartidoNavigation)
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.IdActividadNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdDiaRecoleccionNavigation)
                .Include(x => x.IdSemanaRecoleccionNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .Include(x => x.IdCamionNavigation)
                .Skip(consulta.Start)
                .Take(take)
                .ToListAsync();

            return new GrillaPaginadaResult<ClientesEstablecimiento>
            {
                Total = total,
                Filtered = filtered,
                Items = items
            };
        }

        public async Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta)
        {
            consulta ??= new GrillaPaginadaConsulta();
            var query = AplicarFiltrosEstablecimientos(_db.ClientesEstablecimientos.AsNoTracking(), consulta);
            query = AplicarOrdenEstablecimientos(query, consulta.SortColumn, consulta.SortDesc);
            var ids = await query.Select(x => x.Id).ToListAsync();
            return ids.FindIndex(x => x == id);
        }

        private static IQueryable<ClientesEstablecimiento> AplicarFiltrosEstablecimientos(
            IQueryable<ClientesEstablecimiento> query,
            GrillaPaginadaConsulta consulta)
        {
            if (!string.IsNullOrWhiteSpace(consulta.Search))
            {
                var s = consulta.Search.Trim();
                query = query.Where(e =>
                    e.Nombre.Contains(s) ||
                    (e.Cuit != null && e.Cuit.Contains(s)) ||
                    (e.IdEstablecimientoCliente != null && e.IdEstablecimientoCliente.Contains(s)) ||
                    (e.Calle != null && e.Calle.Contains(s)) ||
                    (e.Descripcion != null && e.Descripcion.Contains(s)) ||
                    (e.IdClienteNavigation != null && e.IdClienteNavigation.Nombre.Contains(s)) ||
                    e.Id.ToString().Contains(s));
            }

            if (consulta.Filters == null)
                return query;

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Id", out var idTxt) && int.TryParse(idTxt, out var idF))
                query = query.Where(x => x.Id == idF);

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "IdEstablecimientoCliente", out var idMin))
                query = query.Where(x => x.IdEstablecimientoCliente != null && x.IdEstablecimientoCliente.Contains(idMin));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Cliente", out var cliente))
                query = query.Where(x => x.IdClienteNavigation != null && x.IdClienteNavigation.Nombre.Contains(cliente));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Nombre", out var nombre))
                query = query.Where(x => x.Nombre.Contains(nombre));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Cuit", out var cuit))
                query = query.Where(x => x.Cuit != null && x.Cuit.Contains(cuit));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Provincia", out var provincia))
                query = query.Where(x => x.IdProvinciaNavigation != null && x.IdProvinciaNavigation.Nombre.Contains(provincia));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Partido", out var partido))
                query = query.Where(x => x.IdPartidoNavigation != null && x.IdPartidoNavigation.Nombre.Contains(partido));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "CodigoPartido", out var codPartido))
                query = query.Where(x => x.IdPartidoNavigation != null && x.IdPartidoNavigation.Codigo.Contains(codPartido));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "Localidad", out var localidad))
                query = query.Where(x =>
                    (x.Localidad != null && x.Localidad.Contains(localidad)) ||
                    (x.IdLocalidadNavigation != null && x.IdLocalidadNavigation.Nombre.Contains(localidad)));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "CodigoLocalidad", out var codLoc))
                query = query.Where(x => x.IdLocalidadNavigation != null && x.IdLocalidadNavigation.Codigo.Contains(codLoc));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "DiaRecoleccion", out var dia))
                query = query.Where(x => x.IdDiaRecoleccionNavigation != null && x.IdDiaRecoleccionNavigation.Nombre.Contains(dia));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "SemanaRecoleccion", out var sem))
                query = query.Where(x => x.IdSemanaRecoleccionNavigation != null && x.IdSemanaRecoleccionNavigation.Nombre.Contains(sem));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "ListaPrecio", out var lista))
                query = query.Where(x => x.IdListaPrecioNavigation != null && x.IdListaPrecioNavigation.Nombre.Contains(lista));

            if (GrillaFiltroHelper.TryGet(consulta.Filters, "DiasHorarios", out var horarios))
                query = query.Where(x => x.DiasHorarios != null && x.DiasHorarios.Contains(horarios));

            return query;
        }

        private static IQueryable<ClientesEstablecimiento> AplicarOrdenEstablecimientos(
            IQueryable<ClientesEstablecimiento> query,
            string? sortColumn,
            bool desc)
        {
            return (sortColumn ?? "").ToLowerInvariant() switch
            {
                "idestablecimientocliente" => desc
                    ? query.OrderByDescending(x => x.IdEstablecimientoCliente)
                    : query.OrderBy(x => x.IdEstablecimientoCliente),
                "cliente" => desc
                    ? query.OrderByDescending(x => x.IdClienteNavigation!.Nombre)
                    : query.OrderBy(x => x.IdClienteNavigation!.Nombre),
                "nombre" => desc ? query.OrderByDescending(x => x.Nombre) : query.OrderBy(x => x.Nombre),
                "cuit" => desc ? query.OrderByDescending(x => x.Cuit) : query.OrderBy(x => x.Cuit),
                "provincia" => desc
                    ? query.OrderByDescending(x => x.IdProvinciaNavigation!.Nombre)
                    : query.OrderBy(x => x.IdProvinciaNavigation!.Nombre),
                "partido" => desc
                    ? query.OrderByDescending(x => x.IdPartidoNavigation!.Nombre)
                    : query.OrderBy(x => x.IdPartidoNavigation!.Nombre),
                "localidad" => desc
                    ? query.OrderByDescending(x => x.Localidad ?? x.IdLocalidadNavigation!.Nombre)
                    : query.OrderBy(x => x.Localidad ?? x.IdLocalidadNavigation!.Nombre),
                "diarecoleccion" => desc
                    ? query.OrderByDescending(x => x.IdDiaRecoleccionNavigation!.Nombre)
                    : query.OrderBy(x => x.IdDiaRecoleccionNavigation!.Nombre),
                "semanarecoleccion" => desc
                    ? query.OrderByDescending(x => x.IdSemanaRecoleccionNavigation!.Nombre)
                    : query.OrderBy(x => x.IdSemanaRecoleccionNavigation!.Nombre),
                "listaprecio" => desc
                    ? query.OrderByDescending(x => x.IdListaPrecioNavigation!.Nombre)
                    : query.OrderBy(x => x.IdListaPrecioNavigation!.Nombre),
                _ => desc ? query.OrderByDescending(x => x.Id) : query.OrderBy(x => x.Id)
            };
        }

        public async Task<ClientesEstablecimiento?> BuscarDuplicado(int? idExcluir, string? idEstablecimientoCliente)
        {
            // Unicidad por Id del ministerio de Salud (no por nombre ni por cliente).
            var idMin = (idEstablecimientoCliente ?? "").Trim();
            if (string.IsNullOrWhiteSpace(idMin))
                return null;

            var query = _db.ClientesEstablecimientos
                .AsNoTracking()
                .Where(x => x.IdEstablecimientoCliente != null
                            && x.IdEstablecimientoCliente.Trim() == idMin);

            if (idExcluir.HasValue)
                query = query.Where(x => x.Id != idExcluir.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<ClientesEstablecimiento?> ObtenerPrincipalPorCliente(int idCliente)
        {
            return await _db.ClientesEstablecimientos
                .AsNoTracking()
                .Where(x => x.IdCliente == idCliente)
                .OrderBy(x => x.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<List<ClientesEstablecimientosDia>> ObtenerDiasAdicionales(int idEstablecimiento)
        {
            return await _db.ClientesEstablecimientosDias
                .AsNoTracking()
                .Where(x => x.IdEstablecimiento == idEstablecimiento)
                .OrderBy(x => x.Id)
                .ToListAsync();
        }

        public async Task<bool> ReemplazarDiasAdicionales(
            int idEstablecimiento,
            IReadOnlyList<ClientesEstablecimientosDia> dias,
            int idUsuario)
        {
            return await _db.ExecuteInTransactionAsync(async () =>
            {
                var existentes = await _db.ClientesEstablecimientosDias
                    .Where(x => x.IdEstablecimiento == idEstablecimiento)
                    .Select(x => x.Id)
                    .ToListAsync();

                if (existentes.Count > 0)
                {
                    var horarios = await _db.ClientesEstablecimientosDiasHorarios
                        .Where(x => existentes.Contains(x.IdEstablecimientoDia))
                        .ToListAsync();
                    _db.ClientesEstablecimientosDiasHorarios.RemoveRange(horarios);

                    var diasEnt = await _db.ClientesEstablecimientosDias
                        .Where(x => x.IdEstablecimiento == idEstablecimiento)
                        .ToListAsync();
                    _db.ClientesEstablecimientosDias.RemoveRange(diasEnt);
                }

                var ahora = DateTime.Now;
                foreach (var dia in dias)
                {
                    if (dia.IdDia <= 0) continue;

                    _db.ClientesEstablecimientosDias.Add(new ClientesEstablecimientosDia
                    {
                        IdEstablecimiento = idEstablecimiento,
                        IdDia = dia.IdDia,
                        IdCamion = dia.IdCamion,
                        IdUsuarioRegistra = idUsuario,
                        FechaUsuarioRegistra = ahora
                    });
                }

                await _db.SaveChangesAsync();
                return true;
            });
        }

        public async Task<int> ObtenerPrimerIdCatalogo(string tabla)
        {
            return tabla switch
            {
                "Dias" => await _db.Dias.OrderBy(x => x.Id).Select(x => x.Id).FirstOrDefaultAsync(),
                "Semanas" => await _db.Semanas.OrderBy(x => x.Id).Select(x => x.Id).FirstOrDefaultAsync(),
                "ListasPrecios" => await _db.ListasPrecios.OrderBy(x => x.Id).Select(x => x.Id).FirstOrDefaultAsync(),
                _ => 0
            };
        }

        public async Task<OrdenRecorridoOcupanteDto> ObtenerOcupanteOrdenRecorrido(
            int idCamion, int idDia, int idSemana, int orden, int? idExcluirEstablecimiento)
        {
            if (idCamion <= 0 || idDia <= 0 || idSemana <= 0 || orden <= 0)
                return new OrdenRecorridoOcupanteDto { Ocupado = false, Posicion = orden };

            var estQuery = _db.ClientesEstablecimientos.AsNoTracking()
                .Where(x => x.IdCamion == idCamion
                    && x.IdDiaRecoleccion == idDia
                    && x.IdSemanaRecoleccion == idSemana
                    && x.OrdenRecorrido == orden);

            if (idExcluirEstablecimiento is > 0)
                estQuery = estQuery.Where(x => x.Id != idExcluirEstablecimiento.Value);

            var est = await estQuery
                .Select(x => new OrdenRecorridoOcupanteDto
                {
                    Ocupado = true,
                    Posicion = orden,
                    IdEstablecimiento = x.Id,
                    IdCliente = x.IdCliente,
                    Nombre = x.Nombre,
                    Cliente = x.IdClienteNavigation.Nombre
                })
                .FirstOrDefaultAsync();

            if (est != null)
                return est;

            var recQuery = _db.ClientesRecorridos.AsNoTracking()
                .Where(r => r.IdCamion == idCamion
                    && r.IdDia == idDia
                    && r.IdSemana == idSemana
                    && r.Posicion == orden);

            if (idExcluirEstablecimiento is > 0)
                recQuery = recQuery.Where(r => r.IdEstablecimiento != idExcluirEstablecimiento.Value);

            var rec = await recQuery
                .Select(r => new OrdenRecorridoOcupanteDto
                {
                    Ocupado = true,
                    Posicion = orden,
                    IdEstablecimiento = r.IdEstablecimiento,
                    IdCliente = r.IdCliente,
                    Nombre = r.IdEstablecimientoNavigation != null ? r.IdEstablecimientoNavigation.Nombre : null,
                    Cliente = r.IdClienteNavigation.Nombre
                })
                .FirstOrDefaultAsync();

            return rec ?? new OrdenRecorridoOcupanteDto { Ocupado = false, Posicion = orden };
        }

        public async Task DesplazarOrdenRecorridoSiOcupado(
            int idCamion, int idDia, int idSemana, int orden, int? idExcluirEstablecimiento)
        {
            if (idCamion <= 0 || idDia <= 0 || idSemana <= 0 || orden <= 0)
                return;

            var estQuery = _db.ClientesEstablecimientos
                .Where(x => x.IdCamion == idCamion
                    && x.IdDiaRecoleccion == idDia
                    && x.IdSemanaRecoleccion == idSemana
                    && x.OrdenRecorrido != null
                    && x.OrdenRecorrido >= orden);

            if (idExcluirEstablecimiento is > 0)
                estQuery = estQuery.Where(x => x.Id != idExcluirEstablecimiento.Value);

            var ests = await estQuery.OrderByDescending(x => x.OrdenRecorrido).ToListAsync();
            var ocupadaEst = ests.Any(x => x.OrdenRecorrido == orden);

            var recQuery = _db.ClientesRecorridos
                .Where(r => r.IdCamion == idCamion
                    && r.IdDia == idDia
                    && r.IdSemana == idSemana
                    && r.Posicion >= orden);

            if (idExcluirEstablecimiento is > 0)
                recQuery = recQuery.Where(r => r.IdEstablecimiento != idExcluirEstablecimiento.Value);

            var recs = await recQuery.OrderByDescending(r => r.Posicion).ToListAsync();
            var ocupadaRec = recs.Any(r => r.Posicion == orden);

            if (!ocupadaEst && !ocupadaRec)
                return;

            foreach (var e in ests)
                e.OrdenRecorrido = (e.OrdenRecorrido ?? orden) + 1;

            foreach (var r in recs)
                r.Posicion += 1;

            await _db.SaveChangesAsync();
        }
    }
}
