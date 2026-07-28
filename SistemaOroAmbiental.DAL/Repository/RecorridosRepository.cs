using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class RecorridosRepository : IRecorridosRepository
    {
        private readonly SistemaOroAmbientalContext _db;

        public RecorridosRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        public async Task<List<RecorridosMatrizDto>> ObtenerMatriz(int? idCamion)
        {
            try
            {
                var query = from m in _db.RecorridosMatriz.AsNoTracking()
                            join c in _db.Camiones on m.IdCamion equals c.Id
                            join s in _db.Semanas on m.IdSemana equals s.Id
                            join d in _db.Dias on m.IdDia equals d.Id
                            select new RecorridosMatrizDto
                            {
                                Id = m.Id,
                                IdCamion = m.IdCamion,
                                Camion = c.Nombre,
                                IdSemana = m.IdSemana,
                                Semana = s.Nombre,
                                IdDia = m.IdDia,
                                Dia = d.Nombre,
                                Zona = m.Zona,
                                HorarioSalida = m.HorarioSalida
                            };

                if (idCamion.HasValue && idCamion > 0)
                    query = query.Where(x => x.IdCamion == idCamion.Value);

                return await query
                    .OrderBy(x => x.IdSemana)
                    .ThenBy(x => x.IdDia)
                    .ToListAsync();
            }
            catch
            {
                return new List<RecorridosMatrizDto>();
            }
        }

        public async Task<(bool Ok, string Error)> GuardarCeldaMatriz(RecorridosMatriz model)
        {
            try
            {
                var camionOk = await _db.Camiones.AnyAsync(c => c.Id == model.IdCamion);
                var semanaOk = await _db.Semanas.AnyAsync(s => s.Id == model.IdSemana);
                var diaOk = await _db.Dias.AnyAsync(d => d.Id == model.IdDia);
                var usuarioOk = await _db.Usuarios.AnyAsync(u => u.Id == model.IdUsuarioRegistra);

                if (!camionOk)
                    return (false, "La unidad seleccionada no existe.");
                if (!semanaOk)
                    return (false, "La semana seleccionada no existe.");
                if (!diaOk)
                    return (false, "El día seleccionado no existe.");
                if (!usuarioOk)
                    return (false, "Su usuario de sesión no es válido. Cierre sesión y vuelva a entrar.");

                var entity = await _db.RecorridosMatriz
                    .FirstOrDefaultAsync(x =>
                        x.IdCamion == model.IdCamion &&
                        x.IdSemana == model.IdSemana &&
                        x.IdDia == model.IdDia);

                if (entity == null)
                {
                    model.IdUsuarioModifica = null;
                    model.FechaUsuarioModifica = null;
                    _db.RecorridosMatriz.Add(model);
                }
                else
                {
                    entity.Zona = model.Zona;
                    entity.HorarioSalida = string.IsNullOrWhiteSpace(model.HorarioSalida)
                        ? null
                        : model.HorarioSalida.Trim();
                    entity.IdUsuarioModifica = model.IdUsuarioModifica;
                    entity.FechaUsuarioModifica = model.FechaUsuarioModifica;
                }

                await _db.SaveChangesAsync();
                return (true, "");
            }
            catch (DbUpdateException ex)
            {
                return (false, TraducirErrorSql(ex));
            }
            catch (Exception ex)
            {
                return (false, "No se pudo guardar la zona. " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        private static string TraducirErrorSql(Exception ex)
        {
            var msg = ex.InnerException?.Message ?? ex.Message;

            if (msg.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) &&
                msg.Contains("RecorridosMatriz", StringComparison.OrdinalIgnoreCase))
            {
                return "Falta la tabla RecorridosMatriz en la base de datos. Ejecute el script 002 en la base que usa la aplicación.";
            }

            if (msg.Contains("FOREIGN KEY", StringComparison.OrdinalIgnoreCase) ||
                msg.Contains("REFERENCE constraint", StringComparison.OrdinalIgnoreCase))
            {
                if (msg.Contains("Camiones", StringComparison.OrdinalIgnoreCase))
                    return "La unidad seleccionada no es válida.";
                if (msg.Contains("Semanas", StringComparison.OrdinalIgnoreCase))
                    return "La semana seleccionada no es válida.";
                if (msg.Contains("Dias", StringComparison.OrdinalIgnoreCase))
                    return "El día seleccionado no es válido.";
                if (msg.Contains("Usuarios", StringComparison.OrdinalIgnoreCase))
                    return "Su sesión no es válida. Cierre sesión y vuelva a entrar.";

                return "No se pudo guardar por un dato relacionado inválido.";
            }

            if (msg.Contains("UNIQUE KEY", StringComparison.OrdinalIgnoreCase) ||
                msg.Contains("duplicate key", StringComparison.OrdinalIgnoreCase))
            {
                return "Ya existe una zona para esa unidad, semana y día.";
            }

            return "Error al guardar en la base de datos.";
        }

        public async Task<List<ClientesRecorridoDto>> ListarClientesPorRecorrido(int idCamion, int idSemana, int idDia)
        {
            return await QueryClientesRecorridoDto()
                .Where(x =>
                    x.IdCamion == idCamion &&
                    x.IdSemana == idSemana &&
                    x.IdDia == idDia)
                .OrderBy(x => x.Posicion)
                .ToListAsync();
        }

        public async Task<List<ClientesRecorridoDto>> BuscarClientesRecorrido(
            string texto,
            int? idCamion,
            int? idSemana,
            int? idDia)
        {
            var query = QueryClientesRecorridoDto();

            if (idCamion.HasValue && idCamion > 0)
                query = query.Where(x => x.IdCamion == idCamion.Value);

            if (idSemana.HasValue && idSemana > 0)
                query = query.Where(x => x.IdSemana == idSemana.Value);

            if (idDia.HasValue && idDia > 0)
                query = query.Where(x => x.IdDia == idDia.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                query = query.Where(x =>
                    x.RecorridoTexto.Contains(t) ||
                    x.Cliente.Contains(t) ||
                    (x.Establecimiento != null && x.Establecimiento.Contains(t)) ||
                    x.Camion.Contains(t) ||
                    x.Zona.Contains(t));
            }

            return await query
                .OrderBy(x => x.IdCamion)
                .ThenBy(x => x.IdSemana)
                .ThenBy(x => x.IdDia)
                .ThenBy(x => x.Posicion)
                .ToListAsync();
        }

        public async Task<List<ClientesRecorridoDto>> ListarPorCliente(int idCliente)
        {
            return await QueryClientesRecorridoDto()
                .Where(x => x.IdCliente == idCliente)
                .OrderBy(x => x.IdCamion)
                .ThenBy(x => x.IdSemana)
                .ThenBy(x => x.IdDia)
                .ThenBy(x => x.Posicion)
                .ToListAsync();
        }

        public async Task<bool> InsertarClientesRecorrido(ClientesRecorrido model)
        {
            try
            {
                _db.ClientesRecorridos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> ActualizarClientesRecorrido(ClientesRecorrido model)
        {
            try
            {
                var entity = await _db.ClientesRecorridos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                entity.IdCliente = model.IdCliente;
                entity.IdEstablecimiento = model.IdEstablecimiento;
                entity.IdCamion = model.IdCamion;
                entity.IdSemana = model.IdSemana;
                entity.IdDia = model.IdDia;
                entity.Posicion = model.Posicion;
                entity.Activo = model.Activo;
                entity.Observacion = string.IsNullOrWhiteSpace(model.Observacion)
                    ? null
                    : model.Observacion.Trim();
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

        public async Task<bool> EliminarClientesRecorrido(int id)
        {
            try
            {
                var entity = await _db.ClientesRecorridos.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return false;

                _db.ClientesRecorridos.Remove(entity);
                await _db.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException)
            {
                throw;
            }
        }

        public async Task<ClientesRecorrido?> ObtenerClientesRecorrido(int id)
        {
            return await _db.ClientesRecorridos
                .AsNoTracking()
                .Include(x => x.IdClienteNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                .Include(x => x.IdCamionNavigation)
                .Include(x => x.IdSemanaNavigation)
                .Include(x => x.IdDiaNavigation)
                .Include(x => x.IdUsuarioRegistraNavigation)
                .Include(x => x.IdUsuarioModificaNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<HojaRutaDto?> ObtenerHojaRuta(int idCamion, IReadOnlyList<(int IdSemana, int IdDia)> recorridos, DateTime fecha)
        {
            if (recorridos == null || recorridos.Count == 0)
                return null;

            if (recorridos.Count == 1)
            {
                var unico = recorridos[0];
                return await ObtenerHojaRutaSingle(idCamion, unico.IdSemana, unico.IdDia, fecha);
            }

            var camion = await _db.Camiones.AsNoTracking().FirstOrDefaultAsync(c => c.Id == idCamion);
            if (camion == null)
                return null;

            var semanasOrden = await _db.Semanas.AsNoTracking().OrderBy(s => s.Id).Select(s => s.Id).ToListAsync();
            var diasOrden = await _db.Dias.AsNoTracking().OrderBy(d => d.Id).Select(d => d.Id).ToListAsync();

            var recorridosOrdenados = recorridos
                .Distinct()
                .OrderBy(r => semanasOrden.IndexOf(r.IdSemana))
                .ThenBy(r => diasOrden.IndexOf(r.IdDia))
                .ToList();

            var preciosReferencia = await ObtenerPreciosDescartadoresReferencia();
            var secciones = new List<HojaRutaSeccionDto>();

            foreach (var (idSemana, idDia) in recorridosOrdenados)
            {
                var hoja = await ObtenerHojaRutaSingle(idCamion, idSemana, idDia, fecha);
                if (hoja == null)
                    continue;

                secciones.Add(new HojaRutaSeccionDto
                {
                    Titulo = hoja.Titulo,
                    Semana = hoja.Semana,
                    Dia = hoja.Dia,
                    Zona = hoja.Zona,
                    Salida = hoja.Salida,
                    Paradas = hoja.Paradas
                });
            }

            if (secciones.Count == 0)
                return null;

            return new HojaRutaDto
            {
                IdCamion = idCamion,
                Camion = camion.Nombre,
                Titulo = ConstruirTituloHojaRutaCombinada(camion.Nombre, secciones),
                FechaReferencia = fecha.Date,
                PrecioDescartadorGrande = preciosReferencia.grande,
                PrecioDescartadorChico = preciosReferencia.chico,
                Secciones = secciones
            };
        }

        private async Task<HojaRutaDto?> ObtenerHojaRutaSingle(int idCamion, int idSemana, int idDia, DateTime fecha)
        {
            var camion = await _db.Camiones.AsNoTracking().FirstOrDefaultAsync(c => c.Id == idCamion);
            var semana = await _db.Semanas.AsNoTracking().FirstOrDefaultAsync(s => s.Id == idSemana);
            var dia = await _db.Dias.AsNoTracking().FirstOrDefaultAsync(d => d.Id == idDia);

            if (camion == null || semana == null || dia == null)
                return null;

            var matriz = await _db.RecorridosMatriz.AsNoTracking()
                .Where(m => m.IdCamion == idCamion && m.IdSemana == idSemana && m.IdDia == idDia)
                .Select(m => new { m.Zona, m.HorarioSalida })
                .FirstOrDefaultAsync();

            var zona = matriz?.Zona ?? "";
            var salida = matriz?.HorarioSalida?.Trim();

            var items = await _db.ClientesRecorridos.AsNoTracking()
                .Include(r => r.IdClienteNavigation)
                .Include(r => r.IdEstablecimientoNavigation)
                    .ThenInclude(e => e!.ClientesEstablecimientosContactos)
                .Where(r =>
                    r.IdCamion == idCamion &&
                    r.IdSemana == idSemana &&
                    r.IdDia == idDia)
                .OrderBy(r => r.Posicion)
                .ToListAsync();

            var idsClientes = items.Select(i => i.IdCliente).Distinct().ToList();
            var controles = idsClientes.Count == 0
                ? new Dictionary<int, ClientesControlMensual>()
                : await _db.ClientesControlMensuales.AsNoTracking()
                    .Where(c =>
                        idsClientes.Contains(c.IdCliente) &&
                        c.Anio == fecha.Year &&
                        c.Mes == fecha.Month)
                    .ToDictionaryAsync(c => c.IdCliente);

            var preciosReferencia = await ObtenerPreciosDescartadoresReferencia();

            var titulo = ConstruirTituloHojaRuta(semana.Nombre, dia.Nombre, camion.Nombre, zona);
            var paradas = items.Select(r => ConstruirParadaHojaRuta(r, fecha, controles)).ToList();

            return new HojaRutaDto
            {
                IdCamion = idCamion,
                Camion = camion.Nombre,
                IdSemana = idSemana,
                Semana = semana.Nombre,
                IdDia = idDia,
                Dia = dia.Nombre,
                Zona = zona,
                Titulo = titulo,
                FechaReferencia = fecha.Date,
                Salida = salida,
                PrecioDescartadorGrande = preciosReferencia.grande,
                PrecioDescartadorChico = preciosReferencia.chico,
                Paradas = paradas
            };
        }

        private static string ConstruirTituloHojaRutaCombinada(string camion, IReadOnlyList<HojaRutaSeccionDto> secciones)
        {
            var dias = secciones
                .Select(s =>
                {
                    var partes = new List<string>();
                    if (!string.IsNullOrWhiteSpace(s.Semana))
                        partes.Add(s.Semana.Trim());
                    if (!string.IsNullOrWhiteSpace(s.Dia))
                        partes.Add(s.Dia.Trim());
                    return string.Join(" ", partes.Where(p => !string.IsNullOrWhiteSpace(p)));
                })
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList();

            var camionTxt = camion.Trim();
            var titulo = dias.Count > 0 ? string.Join(" · ", dias) : "HOJA DE RUTA";

            if (!string.IsNullOrWhiteSpace(camionTxt))
                titulo = $"{camionTxt} — {titulo}";

            return titulo.ToUpperInvariant();
        }

        private static string ConstruirTituloHojaRuta(string semana, string dia, string camion, string zona)
        {
            var partes = new List<string> { semana.Trim(), dia.Trim() };
            var camionTxt = camion.Trim();
            if (!string.IsNullOrWhiteSpace(camionTxt))
                partes.Add(camionTxt);

            var titulo = string.Join(" ", partes.Where(p => !string.IsNullOrWhiteSpace(p)));
            var zonaTxt = zona.Trim();
            if (!string.IsNullOrWhiteSpace(zonaTxt))
                titulo += " - " + zonaTxt;

            return titulo.ToUpperInvariant();
        }

        private static HojaRutaParadaDto ConstruirParadaHojaRuta(
            ClientesRecorrido recorrido,
            DateTime fecha,
            Dictionary<int, ClientesControlMensual> controles)
        {
            var cliente = recorrido.IdClienteNavigation;
            var establecimiento = recorrido.IdEstablecimientoNavigation;
            controles.TryGetValue(recorrido.IdCliente, out var control);

            var abonoEfectivo = control?.AbonoEfectivo ?? 0;
            var abonoTransferencia = control?.AbonoTransferencia ?? 0;

            var domicilio = ComponerDomicilio(
                establecimiento?.Calle ?? cliente.Calle,
                establecimiento?.Numero ?? cliente.Numero,
                establecimiento?.PisoDepartamento ?? cliente.PisoDepartamento,
                establecimiento?.Domicilio ?? cliente.Domicilio);
            if (!string.IsNullOrWhiteSpace(establecimiento?.Nombre) &&
                !string.Equals(establecimiento.Nombre.Trim(), cliente.Nombre.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                domicilio = string.IsNullOrWhiteSpace(domicilio)
                    ? establecimiento.Nombre.Trim()
                    : establecimiento.Nombre.Trim() + " — " + domicilio;
            }

            var localidad = (establecimiento?.Localidad ?? cliente.Localidad ?? "").Trim();
            var telefono = ObtenerTelefonoParada(cliente, establecimiento);
            var horario = FormatearHorarioRecoleccion(establecimiento);
            var observacion = string.IsNullOrWhiteSpace(recorrido.Observacion)
                ? null
                : recorrido.Observacion.Trim();
            var alertaTipo = "normal";

            if (!recorrido.Activo)
            {
                observacion = string.IsNullOrWhiteSpace(observacion)
                    ? "INACTIVO en el recorrido."
                    : "INACTIVO en el recorrido. " + observacion;
                alertaTipo = "alerta";
            }

            return new HojaRutaParadaDto
            {
                Posicion = recorrido.Posicion,
                IdCliente = recorrido.IdCliente,
                Cliente = cliente.Nombre,
                Establecimiento = establecimiento?.Nombre,
                Domicilio = domicilio,
                Localidad = localidad,
                Telefono = telefono,
                Horario = horario,
                AbonoEfectivo = abonoEfectivo,
                AbonoTransferencia = abonoTransferencia,
                Observacion = observacion,
                AlertaTipo = alertaTipo,
                Activo = recorrido.Activo
            };
        }

        private static string ObtenerTelefonoParada(Cliente cliente, ClientesEstablecimiento? establecimiento)
        {
            var contacto = establecimiento?.ClientesEstablecimientosContactos
                .OrderBy(c => c.Id)
                .FirstOrDefault();

            var telefonos = new List<string>();

            void Agregar(string? valor)
            {
                var txt = (valor ?? "").Trim();
                if (string.IsNullOrWhiteSpace(txt)) return;
                if (telefonos.Any(t => string.Equals(t, txt, StringComparison.OrdinalIgnoreCase))) return;
                telefonos.Add(txt);
            }

            if (contacto != null)
            {
                Agregar(contacto.Telefono);
                Agregar(contacto.TelefonoAlt);
            }

            Agregar(cliente.Telefono);
            Agregar(cliente.TelefonoAlt);

            return string.Join(" / ", telefonos);
        }

        private static string FormatearHorarioRecoleccion(ClientesEstablecimiento? establecimiento)
        {
            if (establecimiento == null)
                return "";

            return $"{establecimiento.HorarioRecoleccionDesde:hh\\:mm} a {establecimiento.HorarioRecoleccionHasta:hh\\:mm}";
        }

        private async Task<(decimal grande, decimal chico)> ObtenerPreciosDescartadoresReferencia()
        {
            const decimal defaultGrande = 6000m;
            const decimal defaultChico = 3000m;

            try
            {
                var precios = await (
                    from pp in _db.ProductosPrecios.AsNoTracking()
                    join p in _db.Productos.AsNoTracking() on pp.IdProducto equals p.Id
                    where p.Activo
                    select new
                    {
                        p.Nombre,
                        pp.PrecioVenta
                    }).ToListAsync();

                decimal? grande = precios
                    .Where(p => p.Nombre.Contains("Grande", StringComparison.OrdinalIgnoreCase))
                    .Select(p => (decimal?)p.PrecioVenta)
                    .FirstOrDefault();

                decimal? chico = precios
                    .Where(p => p.Nombre.Contains("Chico", StringComparison.OrdinalIgnoreCase))
                    .Select(p => (decimal?)p.PrecioVenta)
                    .FirstOrDefault();

                return (
                    grande.GetValueOrDefault(defaultGrande),
                    chico.GetValueOrDefault(defaultChico));
            }
            catch
            {
                return (defaultGrande, defaultChico);
            }
        }

        public async Task<List<RecorridoSugeridoDto>> ListarSugeridosPorRecoleccion(int idCamion, int idSemana, int idDia)
        {
            var enRuta = await _db.ClientesRecorridos.AsNoTracking()
                .Where(r => r.IdCamion == idCamion && r.IdSemana == idSemana && r.IdDia == idDia)
                .Select(r => new { r.IdCliente, r.IdEstablecimiento })
                .ToListAsync();

            var enRutaPairs = enRuta
                .Select(r => (r.IdCliente, r.IdEstablecimiento))
                .ToList();

            var raw = await (
                from e in _db.ClientesEstablecimientos.AsNoTracking()
                join c in _db.Clientes.AsNoTracking() on e.IdCliente equals c.Id
                where e.IdSemanaRecoleccion == idSemana
                   && e.IdDiaRecoleccion == idDia
                   && (e.IdCamion == null || e.IdCamion == idCamion)
                   && c.Activo
                orderby e.HorarioRecoleccionDesde, c.Nombre, e.Nombre
                select new
                {
                    e.Id,
                    e.IdCliente,
                    Cliente = c.Nombre,
                    Establecimiento = e.Nombre,
                    e.Calle,
                    e.Numero,
                    e.PisoDepartamento,
                    DomicilioEst = e.Domicilio,
                    DomicilioCli = c.Domicilio,
                    Localidad = e.Localidad ?? c.Localidad,
                    e.HorarioRecoleccionDesde,
                    e.HorarioRecoleccionHasta
                }).ToListAsync();

            return raw.Select(x => new RecorridoSugeridoDto
            {
                IdEstablecimiento = x.Id,
                IdCliente = x.IdCliente,
                Cliente = x.Cliente,
                Establecimiento = x.Establecimiento,
                Domicilio = ComponerDomicilio(x.Calle, x.Numero, x.PisoDepartamento, x.DomicilioEst ?? x.DomicilioCli),
                Localidad = x.Localidad,
                Horario = $"{x.HorarioRecoleccionDesde:hh\\:mm} a {x.HorarioRecoleccionHasta:hh\\:mm}",
                YaEnRecorrido = EstaEnRecorrido(x.IdCliente, x.Id, enRutaPairs)
            }).ToList();
        }

        public async Task<(int Insertados, string Error)> InsertarClientesRecorridoBulk(
            int idCamion,
            int idSemana,
            int idDia,
            int idUsuario,
            IReadOnlyList<(int IdCliente, int? IdEstablecimiento)> items)
        {
            if (items == null || items.Count == 0)
                return (0, "No hay clientes para agregar.");

            try
            {
                var enRuta = await _db.ClientesRecorridos
                    .Where(r => r.IdCamion == idCamion && r.IdSemana == idSemana && r.IdDia == idDia)
                    .Select(r => new { r.IdCliente, r.IdEstablecimiento })
                    .ToListAsync();

                var enRutaPairs = enRuta
                    .Select(r => (r.IdCliente, r.IdEstablecimiento))
                    .ToList();

                var maxPos = await _db.ClientesRecorridos
                    .Where(r => r.IdCamion == idCamion && r.IdSemana == idSemana && r.IdDia == idDia)
                    .Select(r => (int?)r.Posicion)
                    .MaxAsync() ?? 0;

                var pos = maxPos;
                var insertados = 0;
                var ahora = DateTime.Now;

                foreach (var item in items)
                {
                    if (EstaEnRecorrido(item.IdCliente, item.IdEstablecimiento, enRutaPairs))
                        continue;

                    pos++;
                    var entity = new ClientesRecorrido
                    {
                        IdCliente = item.IdCliente,
                        IdEstablecimiento = item.IdEstablecimiento > 0 ? item.IdEstablecimiento : null,
                        IdCamion = idCamion,
                        IdSemana = idSemana,
                        IdDia = idDia,
                        Posicion = pos,
                        Activo = true,
                        IdUsuarioRegistra = idUsuario,
                        FechaUsuarioRegistra = ahora
                    };

                    _db.ClientesRecorridos.Add(entity);
                    enRutaPairs.Add((entity.IdCliente, entity.IdEstablecimiento));
                    insertados++;
                }

                if (insertados > 0)
                    await _db.SaveChangesAsync();

                return (insertados, "");
            }
            catch (DbUpdateException ex)
            {
                return (0, TraducirErrorSql(ex));
            }
            catch (Exception ex)
            {
                return (0, "No se pudieron agregar los clientes. " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        private static bool EstaEnRecorrido(
            int idCliente,
            int? idEstablecimiento,
            List<(int IdCliente, int? IdEstablecimiento)> enRuta)
        {
            foreach (var (rCliente, rEst) in enRuta)
            {
                if (idEstablecimiento.HasValue && idEstablecimiento > 0 && rEst == idEstablecimiento)
                    return true;

                if (rCliente == idCliente && (rEst == null || rEst <= 0))
                    return true;
            }

            return false;
        }

        private IQueryable<ClientesRecorridoDto> QueryClientesRecorridoDto()
        {
            return from r in _db.ClientesRecorridos.AsNoTracking()
                   join cl in _db.Clientes on r.IdCliente equals cl.Id
                   join c in _db.Camiones on r.IdCamion equals c.Id
                   join s in _db.Semanas on r.IdSemana equals s.Id
                   join d in _db.Dias on r.IdDia equals d.Id
                   join m in _db.RecorridosMatriz on new { r.IdCamion, r.IdSemana, r.IdDia }
                       equals new { m.IdCamion, m.IdSemana, m.IdDia } into mj
                   from m in mj.DefaultIfEmpty()
                   join e in _db.ClientesEstablecimientos on r.IdEstablecimiento equals e.Id into ej
                   from e in ej.DefaultIfEmpty()
                   select new ClientesRecorridoDto
                   {
                       Id = r.Id,
                       IdCliente = r.IdCliente,
                       Cliente = cl.Nombre,
                       IdEstablecimiento = r.IdEstablecimiento,
                       Establecimiento = e != null ? e.Nombre : null,
                       Domicilio = (e != null ? e.Domicilio : null) ?? cl.Domicilio,
                       Localidad = e != null ? (e.Localidad ?? cl.Localidad) : cl.Localidad,
                       IdCamion = r.IdCamion,
                       Camion = c.Nombre,
                       IdSemana = r.IdSemana,
                       Semana = s.Nombre,
                       IdDia = r.IdDia,
                       Dia = d.Nombre,
                       Zona = m != null ? m.Zona : "",
                       Posicion = r.Posicion,
                       Activo = r.Activo,
                       Observacion = r.Observacion,
                       RecorridoTexto = s.Nombre + " " + d.Nombre
                   };
        }

        private static string ComponerDomicilio(string? calle, string? numero, string? pisoDepartamento, string? legacy)
        {
            var partes = new List<string>();
            if (!string.IsNullOrWhiteSpace(calle)) partes.Add(calle.Trim());
            if (!string.IsNullOrWhiteSpace(numero)) partes.Add(numero.Trim());
            if (!string.IsNullOrWhiteSpace(pisoDepartamento)) partes.Add(pisoDepartamento.Trim());

            if (partes.Count > 0)
                return string.Join(" ", partes);

            return string.IsNullOrWhiteSpace(legacy) ? "" : legacy.Trim();
        }
    }
}
