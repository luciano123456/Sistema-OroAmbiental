using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public partial class ClientesRepository : IClientesRepository
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
                entity.IdLocalidad = model.IdLocalidad;
                entity.CodPostal = model.CodPostal;
                entity.IdCondicionIva = model.IdCondicionIva;
                entity.Email = model.Email;
                entity.IdProfesion = model.IdProfesion;
                entity.Activo = model.Activo;
                entity.NumeroCliente = model.NumeroCliente;
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
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.ClientesEstablecimientos)
                    .ThenInclude(e => e.IdEstadoNavigation)
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
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.ClientesEstablecimientos)
                    .ThenInclude(e => e.IdEstadoNavigation)
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
                .Include(x => x.IdLocalidadNavigation)
                .Include(x => x.IdCondicionIvaNavigation)
                .Include(x => x.IdProfesionNavigation)
                .Include(x => x.IdEstadoNavigation)
                .Include(x => x.IdMotivoNavigation)
                .Include(x => x.IdCalificacionNavigation)
                .Include(x => x.IdTipoGeneradorNavigation)
                .Include(x => x.ClientesEstablecimientos)
                    .ThenInclude(e => e.IdEstadoNavigation)
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

        private IQueryable<Cliente> AplicarFiltrosClientes(IQueryable<Cliente> query, GrillaPaginadaConsulta consulta)
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

            query = AplicarFiltrosColumnasRecorrido(query, consulta.Filters);
            query = AplicarFiltrosExtraClientes(query, consulta.Filters);
            return query;
        }

        private IQueryable<Cliente> AplicarFiltrosExtraClientes(IQueryable<Cliente> query, Dictionary<string, string> filters)
        {
            var hoy = DateTime.Today;

            if (GrillaFiltroHelper.TryGet(filters, "Situacion", out var situacion))
            {
                switch (situacion.Trim().ToLowerInvariant())
                {
                    case "activos":
                        query = query.Where(c => c.Activo);
                        query = WhereNoEstadoContiene(query, "Baja");
                        query = WhereNoEstadoContiene(query, "SUSPEND");
                        query = ExcluirEnLicencia(query, hoy);
                        break;
                    case "suspendidos":
                        query = WhereEstadoContiene(query, "SUSPEND");
                        break;
                    case "baja":
                        query = WhereEstadoContiene(query, "Baja");
                        break;
                    case "licencia":
                        query = WhereEnLicencia(query, hoy);
                        break;
                    case "alertas":
                        query = WhereLicenciaPorVencer(query, hoy, hoy.AddDays(31));
                        break;
                }
            }

            if (GrillaFiltroHelper.TryGet(filters, "TipoGenerador", out var tipoTxt) && int.TryParse(tipoTxt, out var idTipo) && idTipo > 0)
            {
                query = query.Where(c =>
                    c.IdTipoGenerador == idTipo
                    || c.ClientesEstablecimientos.Any(e => e.IdTipoGenerador == idTipo));
            }

            if (GrillaFiltroHelper.TryGet(filters, "Calificacion", out var calTxt) && int.TryParse(calTxt, out var idCal) && idCal > 0)
            {
                query = query.Where(c =>
                    c.IdCalificacion == idCal
                    || c.ClientesEstablecimientos.Any(e => e.IdCalificacion == idCal));
            }

            if (GrillaFiltroHelper.TryGet(filters, "Localidad", out var loc))
            {
                query = query.Where(c =>
                    (c.Domicilio != null && c.Domicilio.Contains(loc))
                    || (c.Calle != null && c.Calle.Contains(loc))
                    || c.ClientesEstablecimientos.Any(e =>
                        (e.Localidad != null && e.Localidad.Contains(loc))
                        || (e.Calle != null && e.Calle.Contains(loc))
                        || (e.Domicilio != null && e.Domicilio.Contains(loc))
                        || (e.IdLocalidadNavigation != null && e.IdLocalidadNavigation.Nombre.Contains(loc))
                        || (e.IdPartidoNavigation != null && e.IdPartidoNavigation.Nombre.Contains(loc))));
            }

            if (GrillaFiltroHelper.TryGet(filters, "NroCliente", out var nroTxt) && int.TryParse(nroTxt, out var nroCliente))
                query = query.Where(c => c.NumeroCliente == nroCliente);

            if (GrillaFiltroHelper.TryGet(filters, "Contrato", out var contrato))
            {
                switch (contrato.Trim().ToLowerInvariant())
                {
                    case "vigente":
                        query = query.Where(c => c.Contratos.Any(ct => ct.FechaInicio <= hoy && ct.FechaVencimiento >= hoy));
                        break;
                    case "vencido":
                        query = query.Where(c =>
                            c.Contratos.Any()
                            && !c.Contratos.Any(ct => ct.FechaInicio <= hoy && ct.FechaVencimiento >= hoy));
                        break;
                    case "sin":
                        query = query.Where(c => !c.Contratos.Any());
                        break;
                }
            }

            if (GrillaFiltroHelper.TryGet(filters, "Contacto", out var contacto))
            {
                switch (contacto.Trim().ToLowerInvariant())
                {
                    case "conemail":
                        query = query.Where(c => c.Email != null && c.Email != "");
                        break;
                    case "sinemail":
                        query = query.Where(c => c.Email == null || c.Email == "");
                        break;
                    case "contel":
                        query = query.Where(c => c.Telefono != null && c.Telefono != "");
                        break;
                    case "sintel":
                        query = query.Where(c => c.Telefono == null || c.Telefono == "");
                        break;
                }
            }

            var cobertura = "";
            if (GrillaFiltroHelper.TryGet(filters, "RecCobertura", out var cob))
                cobertura = cob.Trim().ToLowerInvariant();

            if (cobertura == "sin")
                return FiltrarSinRecorrido(query);

            var dias = GrillaFiltroHelper.TryGet(filters, "RecDia", out var diasTxt) ? ParseIdList(diasTxt) : new List<int>();
            var semanas = GrillaFiltroHelper.TryGet(filters, "RecSemana", out var semTxt) ? ParseIdList(semTxt) : new List<int>();
            var camion = GrillaFiltroHelper.TryGet(filters, "RecCamion", out var camTxt) && int.TryParse(camTxt, out var idCam) ? idCam : 0;
            var zona = GrillaFiltroHelper.TryGet(filters, "RecZona", out var zonaTxt) ? zonaTxt : "";

            var hayDetalle = dias.Count > 0 || semanas.Count > 0 || camion > 0 || zona.Length > 0;
            if (hayDetalle)
                return FiltrarRecorridoDetalle(query, dias, semanas, camion, zona);

            if (cobertura == "con")
                return FiltrarConRecorrido(query);

            return query;
        }

        private static List<int> ParseIdList(string raw)
        {
            var list = new List<int>();
            foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (int.TryParse(part, out var id) && id > 0 && !list.Contains(id))
                    list.Add(id);
            }
            return list;
        }

        private IQueryable<Cliente> FiltrarSinRecorrido(IQueryable<Cliente> query)
        {
            return query.Where(c =>
                !_db.ClientesRecorridos.Any(r => r.Activo && r.IdCliente == c.Id)
                && !_db.ClientesEstablecimientos.Any(e =>
                    e.IdCliente == c.Id
                    && (e.IdDiaRecoleccion != null || e.IdSemanaRecoleccion != null || e.IdCamion != null))
                && !_db.ClientesEstablecimientosDias.Any(d => d.IdEstablecimientoNavigation.IdCliente == c.Id));
        }

        private IQueryable<Cliente> FiltrarConRecorrido(IQueryable<Cliente> query)
        {
            return query.Where(c =>
                _db.ClientesRecorridos.Any(r => r.Activo && r.IdCliente == c.Id)
                || _db.ClientesEstablecimientos.Any(e =>
                    e.IdCliente == c.Id
                    && (e.IdDiaRecoleccion != null || e.IdSemanaRecoleccion != null || e.IdCamion != null))
                || _db.ClientesEstablecimientosDias.Any(d => d.IdEstablecimientoNavigation.IdCliente == c.Id));
        }

        private IQueryable<Cliente> FiltrarRecorridoDetalle(
            IQueryable<Cliente> query,
            List<int> dias,
            List<int> semanas,
            int camion,
            string zona)
        {
            var filtrarDias = dias.Count > 0;
            var filtrarSemanas = semanas.Count > 0;
            var filtrarCamion = camion > 0;
            var filtrarZona = zona.Length > 0;

            var rec = _db.ClientesRecorridos.AsNoTracking().Where(r => r.Activo);
            if (filtrarDias) rec = rec.Where(r => dias.Contains(r.IdDia));
            if (filtrarSemanas) rec = rec.Where(r => semanas.Contains(r.IdSemana));
            if (filtrarCamion) rec = rec.Where(r => r.IdCamion == camion);
            if (filtrarZona)
            {
                rec = rec.Where(r => _db.RecorridosMatriz.Any(m =>
                    m.IdCamion == r.IdCamion
                    && m.IdSemana == r.IdSemana
                    && m.IdDia == r.IdDia
                    && m.Zona.Contains(zona)));
            }

            var prim = _db.ClientesEstablecimientos.AsNoTracking().AsQueryable();
            if (filtrarDias) prim = prim.Where(e => e.IdDiaRecoleccion != null && dias.Contains(e.IdDiaRecoleccion.Value));
            if (filtrarSemanas) prim = prim.Where(e => e.IdSemanaRecoleccion != null && semanas.Contains(e.IdSemanaRecoleccion.Value));
            if (filtrarCamion) prim = prim.Where(e => e.IdCamion == camion);
            if (filtrarZona)
            {
                prim = prim.Where(e =>
                    e.IdCamion != null
                    && e.IdSemanaRecoleccion != null
                    && e.IdDiaRecoleccion != null
                    && _db.RecorridosMatriz.Any(m =>
                        m.IdCamion == e.IdCamion.Value
                        && m.IdSemana == e.IdSemanaRecoleccion.Value
                        && m.IdDia == e.IdDiaRecoleccion.Value
                        && m.Zona.Contains(zona)));
            }

            var extra = _db.ClientesEstablecimientosDias.AsNoTracking().AsQueryable();
            if (filtrarDias) extra = extra.Where(d => dias.Contains(d.IdDia));
            if (filtrarSemanas)
            {
                extra = extra.Where(d =>
                    d.IdEstablecimientoNavigation.IdSemanaRecoleccion != null
                    && semanas.Contains(d.IdEstablecimientoNavigation.IdSemanaRecoleccion.Value));
            }
            if (filtrarCamion) extra = extra.Where(d => d.IdCamion == camion);
            if (filtrarZona)
            {
                extra = extra.Where(d =>
                    d.IdCamion != null
                    && d.IdEstablecimientoNavigation.IdSemanaRecoleccion != null
                    && _db.RecorridosMatriz.Any(m =>
                        m.IdCamion == d.IdCamion.Value
                        && m.IdSemana == d.IdEstablecimientoNavigation.IdSemanaRecoleccion.Value
                        && m.IdDia == d.IdDia
                        && m.Zona.Contains(zona)));
            }

            var idsRec = rec.Select(r => r.IdCliente);
            var idsPrim = prim.Select(e => e.IdCliente);
            var idsExtra = extra.Select(d => d.IdEstablecimientoNavigation.IdCliente);

            return query.Where(c => idsRec.Contains(c.Id) || idsPrim.Contains(c.Id) || idsExtra.Contains(c.Id));
        }

        private static IQueryable<Cliente> WhereEstadoContiene(IQueryable<Cliente> query, string patron)
        {
            return query.Where(c =>
                (c.IdEstadoNavigation != null && c.IdEstadoNavigation.Nombre.Contains(patron))
                || c.ClientesEstablecimientos.Any(e =>
                    e.IdEstadoNavigation != null && e.IdEstadoNavigation.Nombre.Contains(patron)));
        }

        private static IQueryable<Cliente> WhereNoEstadoContiene(IQueryable<Cliente> query, string patron)
        {
            return query.Where(c =>
                (c.IdEstadoNavigation == null || !c.IdEstadoNavigation.Nombre.Contains(patron))
                && !c.ClientesEstablecimientos.Any(e =>
                    e.IdEstadoNavigation != null && e.IdEstadoNavigation.Nombre.Contains(patron)));
        }

        private static IQueryable<Cliente> WhereEnLicencia(IQueryable<Cliente> query, DateTime hoy)
        {
            return query.Where(c =>
                c.ClientesEstablecimientos.Any(e =>
                    (e.FechaLicenciaDesde != null && e.FechaLicenciaHasta != null && e.FechaLicenciaDesde <= hoy && e.FechaLicenciaHasta >= hoy)
                    || (e.FechaLicenciaDesde != null && e.FechaLicenciaHasta == null && e.FechaLicenciaDesde <= hoy)
                    || (e.FechaLicenciaDesde == null && e.FechaLicenciaHasta != null && e.FechaLicenciaHasta >= hoy)
                    || (e.FechaLicenciaDesde == null && e.FechaLicenciaHasta == null
                        && e.IdEstadoNavigation != null && e.IdEstadoNavigation.Nombre.Contains("Licencia")))
                || (
                    !c.ClientesEstablecimientos.Any(e => e.IdEstado != null || e.FechaLicenciaDesde != null || e.FechaLicenciaHasta != null)
                    && (
                        (c.FechaLicenciaDesde != null && c.FechaLicenciaHasta != null && c.FechaLicenciaDesde <= hoy && c.FechaLicenciaHasta >= hoy)
                        || (c.FechaLicenciaDesde != null && c.FechaLicenciaHasta == null && c.FechaLicenciaDesde <= hoy)
                        || (c.FechaLicenciaDesde == null && c.FechaLicenciaHasta != null && c.FechaLicenciaHasta >= hoy)
                        || (c.FechaLicenciaDesde == null && c.FechaLicenciaHasta == null
                            && c.IdEstadoNavigation != null && c.IdEstadoNavigation.Nombre.Contains("Licencia"))
                    )
                ));
        }

        private IQueryable<Cliente> ExcluirEnLicencia(IQueryable<Cliente> query, DateTime hoy)
        {
            var enLicencia = WhereEnLicencia(_db.Clientes.AsNoTracking(), hoy).Select(c => c.Id);
            return query.Where(c => !enLicencia.Contains(c.Id));
        }

        private static IQueryable<Cliente> WhereLicenciaPorVencer(IQueryable<Cliente> query, DateTime hoy, DateTime limite)
        {
            query = WhereEnLicencia(query, hoy);
            return query.Where(c =>
                (
                    c.ClientesEstablecimientos.Any(e =>
                        e.FechaLicenciaHasta != null
                        && e.FechaLicenciaHasta >= hoy
                        && e.FechaLicenciaHasta <= limite
                        && !c.ClientesEstablecimientos.Any(o =>
                            o.FechaLicenciaHasta != null && o.FechaLicenciaHasta < e.FechaLicenciaHasta))
                )
                || (
                    !c.ClientesEstablecimientos.Any(e => e.FechaLicenciaHasta != null)
                    && c.FechaLicenciaHasta != null
                    && c.FechaLicenciaHasta >= hoy
                    && c.FechaLicenciaHasta <= limite
                ));
        }

        private IQueryable<Cliente> AplicarOrdenClientes(IQueryable<Cliente> query, string? sortColumn, bool desc)
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
                "recorrido" => desc
                    ? query.OrderByDescending(c =>
                        _db.ClientesRecorridos.Any(r => r.Activo && r.IdCliente == c.Id)
                        || _db.ClientesEstablecimientos.Any(e =>
                            e.IdCliente == c.Id
                            && (e.IdDiaRecoleccion != null || e.IdSemanaRecoleccion != null || e.IdCamion != null))
                        || _db.ClientesEstablecimientosDias.Any(d => d.IdEstablecimientoNavigation.IdCliente == c.Id))
                        .ThenBy(c => c.Id)
                    : query.OrderBy(c =>
                        _db.ClientesRecorridos.Any(r => r.Activo && r.IdCliente == c.Id)
                        || _db.ClientesEstablecimientos.Any(e =>
                            e.IdCliente == c.Id
                            && (e.IdDiaRecoleccion != null || e.IdSemanaRecoleccion != null || e.IdCamion != null))
                        || _db.ClientesEstablecimientosDias.Any(d => d.IdEstablecimientoNavigation.IdCliente == c.Id))
                        .ThenBy(c => c.Id),
                "recorridos" => desc
                    ? query.OrderByDescending(c => _db.ClientesRecorridos.Where(r => r.Activo && r.IdCliente == c.Id).Min(r => (int?)r.IdSemana))
                        .ThenByDescending(c => _db.ClientesRecorridos.Where(r => r.Activo && r.IdCliente == c.Id).Min(r => (int?)r.IdDia))
                        .ThenByDescending(c => c.Id)
                    : query.OrderBy(c => _db.ClientesRecorridos.Where(r => r.Activo && r.IdCliente == c.Id).Min(r => (int?)r.IdSemana))
                        .ThenBy(c => _db.ClientesRecorridos.Where(r => r.Activo && r.IdCliente == c.Id).Min(r => (int?)r.IdDia))
                        .ThenBy(c => c.Id),
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
