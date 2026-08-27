using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class RecorridosRepository : IRecorridosRepository
    {
        private readonly SistemaOroAmbientalContext _db;
        private readonly IClientesOperativoRepository _operativo;

        public RecorridosRepository(SistemaOroAmbientalContext context, IClientesOperativoRepository operativo)
        {
            _db = context;
            _operativo = operativo;
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
            var list = await QueryClientesRecorridoDto()
                .Where(x =>
                    x.IdCamion == idCamion &&
                    x.IdSemana == idSemana &&
                    x.IdDia == idDia)
                .OrderBy(x => x.Posicion)
                .ToListAsync();

            var hoy = DateTime.Today;
            foreach (var item in list)
                item.EnLicencia = EstaEnLicencia(item.FechaLicenciaDesde, item.FechaLicenciaHasta, item.EstadoNombre, hoy);

            await CargarProductosEnClientesRecorrido(list);
            return list;
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
                    .Take(40)
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

        public async Task<bool> InsertarClientesRecorrido(ClientesRecorrido model, bool desplazarSiOcupada = true)
        {
            try
            {
                await AsegurarPosicionClientesRecorrido(model);
                if (model.Posicion <= 0)
                    return false;

                if (desplazarSiOcupada)
                    await DesplazarPosicionesSiOcupada(model, idExcluir: null);

                _db.ClientesRecorridos.Add(model);
                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> ActualizarClientesRecorrido(ClientesRecorrido model, bool desplazarSiOcupada = true)
        {
            try
            {
                var entity = await _db.ClientesRecorridos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (entity == null)
                    return false;

                var cambiaSlot = entity.IdCamion != model.IdCamion
                    || entity.IdSemana != model.IdSemana
                    || entity.IdDia != model.IdDia
                    || entity.Posicion != model.Posicion;

                if (cambiaSlot && desplazarSiOcupada)
                    await DesplazarPosicionesSiOcupada(model, idExcluir: entity.Id);

                entity.IdCliente = model.IdCliente;
                entity.IdEstablecimiento = model.IdEstablecimiento;
                entity.IdCamion = model.IdCamion;
                entity.IdSemana = model.IdSemana;
                entity.IdDia = model.IdDia;
                entity.Posicion = model.Posicion;
                entity.Activo = model.Activo;
                entity.Reprogramado = model.Reprogramado;
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

        public async Task<HojaRutaDto?> ObtenerHojaRuta(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            DateTime fecha,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null)
        {
            if (recorridos == null || recorridos.Count == 0)
                return null;

            if (recorridos.Count == 1)
            {
                var unico = recorridos[0];
                return await ObtenerHojaRutaSingle(idCamion, unico.IdSemana, unico.IdDia, fecha, idsRecorridoExcluir);
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
                var hoja = await ObtenerHojaRutaSingle(idCamion, idSemana, idDia, fecha, idsRecorridoExcluir);
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

            var totalEf = secciones.SelectMany(s => s.Paradas).Sum(p => p.AbonoEfectivo);
            var totalTr = secciones.SelectMany(s => s.Paradas).Sum(p => p.AbonoTransferencia);

            return new HojaRutaDto
            {
                IdCamion = idCamion,
                Camion = camion.Nombre,
                Titulo = ConstruirTituloHojaRutaCombinada(camion.Nombre, secciones),
                FechaReferencia = fecha.Date,
                PrecioDescartadorGrande = preciosReferencia.grande,
                PrecioDescartadorChico = preciosReferencia.chico,
                TotalAbonoEfectivo = totalEf,
                TotalAbonoTransferencia = totalTr,
                Secciones = secciones,
                ListasPrecios = await ObtenerListasPrecioHoja()
            };
        }

        private async Task<HojaRutaDto?> ObtenerHojaRutaSingle(
            int idCamion,
            int idSemana,
            int idDia,
            DateTime fecha,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null)
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
                    .ThenInclude(c => c!.IdEstadoNavigation)
                .Include(r => r.IdEstablecimientoNavigation)
                    .ThenInclude(e => e!.ClientesEstablecimientosContactos)
                .Include(r => r.IdEstablecimientoNavigation)
                    .ThenInclude(e => e!.ClientesEstablecimientosProductos)
                        .ThenInclude(p => p.IdProductoNavigation)
                .Include(r => r.IdEstablecimientoNavigation)
                    .ThenInclude(e => e!.ClientesEstablecimientosProductos)
                        .ThenInclude(p => p.IdListaPrecioNavigation)
                            .ThenInclude(l => l!.IdTipoPagoNavigation)
                .Where(r =>
                    r.IdCamion == idCamion &&
                    r.IdSemana == idSemana &&
                    r.IdDia == idDia)
                .OrderBy(r => r.Posicion)
                .ToListAsync();

            // Licencia: se exportan marcados; solo se omiten si el usuario los excluyó en el momento.
            if (idsRecorridoExcluir is { Count: > 0 })
            {
                var excluir = new HashSet<int>(idsRecorridoExcluir);
                items = items.Where(r => !excluir.Contains(r.Id)).ToList();
            }
            var idsClientes = items.Select(i => i.IdCliente).Distinct().ToList();
            var controles = idsClientes.Count == 0
                ? new Dictionary<int, ClientesControlMensual>()
                : await _db.ClientesControlMensuales.AsNoTracking()
                    .Where(c =>
                        idsClientes.Contains(c.IdCliente) &&
                        c.Anio == fecha.Year &&
                        c.Mes == fecha.Month)
                    .ToDictionaryAsync(c => c.IdCliente);

            var saldos = await ObtenerSaldosHojaRuta(idsClientes, fecha);

            var preciosReferencia = await ObtenerPreciosDescartadoresReferencia();
            var (preciosPorProductoLista, listasPorToken) = await ObtenerPreciosProductoPorLista(
                items
                    .SelectMany(i => i.IdEstablecimientoNavigation?.ClientesEstablecimientosProductos
                        ?? Enumerable.Empty<ClientesEstablecimientosProducto>())
                    .Select(p => p.IdProducto)
                    .Distinct()
                    .ToList());

            var titulo = ConstruirTituloHojaRuta(semana.Nombre, dia.Nombre, camion.Nombre, zona);
            var paradas = items.Select(r => ConstruirParadaHojaRuta(r, fecha, controles, saldos, preciosPorProductoLista, listasPorToken)).ToList();

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
                TotalAbonoEfectivo = paradas.Sum(p => p.AbonoEfectivo),
                TotalAbonoTransferencia = paradas.Sum(p => p.AbonoTransferencia),
                Paradas = paradas,
                ListasPrecios = await ObtenerListasPrecioHoja()
            };
        }

        private async Task<List<HojaRutaListaPrecioDto>> ObtenerListasPrecioHoja()
        {
            return await _db.ListasPrecios.AsNoTracking()
                .Include(l => l.IdTipoPagoNavigation)
                .OrderBy(l => l.Nombre)
                .Select(l => new HojaRutaListaPrecioDto
                {
                    Id = l.Id,
                    Nombre = l.Nombre,
                    IdTipoPago = l.IdTipoPago,
                    TipoPago = l.IdTipoPagoNavigation != null ? l.IdTipoPagoNavigation.Nombre : null,
                    TipoPagoCodigo = l.IdTipoPagoNavigation != null ? l.IdTipoPagoNavigation.Codigo : null
                })
                .ToListAsync();
        }

        private static string ConstruirTituloHojaRutaCombinada(string camion, IReadOnlyList<HojaRutaSeccionDto> secciones)
        {
            var dias = secciones
                .Select(s =>
                {
                    var zona = (s.Zona ?? "").Trim();
                    if (!string.IsNullOrWhiteSpace(zona))
                        return zona;

                    var partes = new List<string>();
                    if (!string.IsNullOrWhiteSpace(s.Semana))
                        partes.Add(s.Semana.Trim());
                    if (!string.IsNullOrWhiteSpace(s.Dia))
                        partes.Add(s.Dia.Trim());
                    if (!string.IsNullOrWhiteSpace(camion))
                        partes.Add(camion.Trim());
                    return string.Join(" ", partes.Where(p => !string.IsNullOrWhiteSpace(p)));
                })
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var titulo = dias.Count > 0 ? string.Join(" · ", dias) : "HOJA DE RUTA";
            return titulo.ToUpperInvariant();
        }

        private static string ConstruirTituloHojaRuta(string semana, string dia, string camion, string zona)
        {
            // Si hay zona/barrio cargada, esa es el título de la hoja; si no, semana + día + unidad.
            var zonaTxt = (zona ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(zonaTxt))
                return zonaTxt.ToUpperInvariant();

            var partes = new List<string> { (semana ?? "").Trim(), (dia ?? "").Trim() };
            var camionTxt = (camion ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(camionTxt))
                partes.Add(camionTxt);

            var titulo = string.Join(" ", partes.Where(p => !string.IsNullOrWhiteSpace(p)));
            return titulo.ToUpperInvariant();
        }

        private async Task<Dictionary<int, (decimal Saldo, string Resumen, string Tone)>> ObtenerSaldosHojaRuta(
            IReadOnlyList<int> idsClientes,
            DateTime fecha)
        {
            var result = new Dictionary<int, (decimal Saldo, string Resumen, string Tone)>();
            if (idsClientes == null || idsClientes.Count == 0)
                return result;

            var anios = new List<int> { fecha.Year };
            if (fecha.Year > 2000)
                anios.Add(fecha.Year - 1);

            var meses = Enumerable.Range(1, 12).ToList();

            foreach (var idCliente in idsClientes.Distinct())
            {
                try
                {
                    var ctrl = await _operativo.ObtenerControlMensualFiltrado(idCliente, anios, meses);
                    result[idCliente] = FormatearSaldoHoja(ctrl);
                }
                catch
                {
                    result[idCliente] = (0, "", "cero");
                }
            }

            return result;
        }

        private static (decimal Saldo, string Resumen, string Tone) FormatearSaldoHoja(ClienteControlFiltradoDto? ctrl)
        {
            if (ctrl == null)
                return (0, "", "cero");

            var total = Math.Round(ctrl.TotalSaldo, 2);
            if (Math.Abs(total) < 0.01m)
                return (0, "SALDO: $ 0", "cero");

            if (total < 0)
            {
                var favor = Math.Abs(total);
                return (total, $"SALDO: $ {favor:N0} A FAVOR", "favor");
            }

            var partes = (ctrl.Filas ?? new List<ClienteControlMensualDto>())
                .Select(f => new { f.Anio, f.Mes, f.MesNombre, Neto = f.Debe - f.Haber })
                .Where(f => f.Neto > 0.01m)
                .OrderBy(f => f.Anio)
                .ThenBy(f => f.Mes)
                .Select(f =>
                {
                    var mes = string.IsNullOrWhiteSpace(f.MesNombre)
                        ? $"MES {f.Mes}"
                        : f.MesNombre.Trim().ToUpperInvariant();
                    return $"{mes} {f.Anio} {f.Neto:N0}";
                })
                .ToList();

            var resumen = partes.Count > 0
                ? $"SALDO: DEBE {string.Join(" + ", partes)} TOTAL ADEUDADO $ {total:N0}"
                : $"SALDO: TOTAL ADEUDADO $ {total:N0}";

            return (total, resumen, "debe");
        }

        private static HojaRutaParadaDto ConstruirParadaHojaRuta(
            ClientesRecorrido recorrido,
            DateTime fecha,
            Dictionary<int, ClientesControlMensual> controles,
            Dictionary<int, (decimal Saldo, string Resumen, string Tone)> saldos,
            IReadOnlyDictionary<(int IdProducto, int IdListaPrecio), decimal>? preciosPorProductoLista = null,
            IReadOnlyDictionary<string, int>? listasPorToken = null)
        {
            var cliente = recorrido.IdClienteNavigation;
            var establecimiento = recorrido.IdEstablecimientoNavigation;
            controles.TryGetValue(recorrido.IdCliente, out var control);
            saldos.TryGetValue(recorrido.IdCliente, out var saldoInfo);

            var productos = MapearProductosParada(establecimiento, preciosPorProductoLista, listasPorToken);
            var (totalEfectivoProductos, totalTransfProductos) = CalcularAbonosProductos(productos, listasPorToken);

            var abonoEfectivo = productos.Count > 0
                ? totalEfectivoProductos
                : (control?.AbonoEfectivo ?? 0);
            var abonoTransferencia = productos.Count > 0
                ? totalTransfProductos
                : (control?.AbonoTransferencia ?? 0);

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

            var localidad = (establecimiento?.Localidad ?? "").Trim();
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

            var enLicencia = cliente != null && EstaEnLicencia(cliente, fecha.Date);
            if (enLicencia)
            {
                observacion = string.IsNullOrWhiteSpace(observacion)
                    ? "\u26A0 DE LICENCIA"
                    : "\u26A0 DE LICENCIA. " + observacion;
                alertaTipo = "alerta";
            }

            if (recorrido.Reprogramado)
            {
                observacion = string.IsNullOrWhiteSpace(observacion)
                    ? "REPROGRAMADO"
                    : "REPROGRAMADO. " + observacion;
                alertaTipo = "alerta";
            }

            return new HojaRutaParadaDto
            {
                Posicion = recorrido.Posicion,
                IdCliente = recorrido.IdCliente,
                IdEstablecimiento = recorrido.IdEstablecimiento,
                Cliente = cliente.Nombre,
                Establecimiento = establecimiento?.Nombre,
                Domicilio = domicilio,
                Localidad = localidad,
                Telefono = telefono,
                Horario = horario,
                AbonoEfectivo = abonoEfectivo,
                AbonoTransferencia = abonoTransferencia,
                Observacion = observacion,
                SaldoResumen = string.IsNullOrWhiteSpace(saldoInfo.Resumen) ? null : saldoInfo.Resumen,
                SaldoActual = saldoInfo.Saldo,
                SaldoTone = string.IsNullOrWhiteSpace(saldoInfo.Tone) ? "cero" : saldoInfo.Tone,
                AlertaTipo = alertaTipo,
                Activo = recorrido.Activo,
                EnLicencia = enLicencia,
                Reprogramado = recorrido.Reprogramado,
                Productos = productos,
                ProductosResumen = FormatearProductosResumen(productos)
            };
        }

        private static List<HojaRutaParadaProductoDto> MapearProductosParada(
            ClientesEstablecimiento? establecimiento,
            IReadOnlyDictionary<(int IdProducto, int IdListaPrecio), decimal>? preciosPorProductoLista,
            IReadOnlyDictionary<string, int>? listasPorToken)
        {
            if (establecimiento?.ClientesEstablecimientosProductos == null)
                return new List<HojaRutaParadaProductoDto>();

            var listas = preciosPorProductoLista ?? new Dictionary<(int, int), decimal>();
            int? idListaEfectivo = null;
            int? idListaTransf = null;
            if (listasPorToken != null)
            {
                if (listasPorToken.TryGetValue("efectivo", out var idEf)) idListaEfectivo = idEf;
                if (listasPorToken.TryGetValue("transf", out var idTr)) idListaTransf = idTr;
            }

            return establecimiento.ClientesEstablecimientosProductos
                .OrderBy(p => p.IdProductoNavigation?.Nombre ?? "")
                .ThenBy(p => p.IdListaPrecioNavigation?.Nombre ?? "")
                .ThenBy(p => p.Id)
                .Select(p =>
                {
                    var precioEfectivo = ResolverPrecioLista(p.IdProducto, idListaEfectivo, listas, p.PrecioVenta);
                    var precioTransf = ResolverPrecioLista(p.IdProducto, idListaTransf, listas, p.PrecioVenta);
                    var tipo = p.IdListaPrecioNavigation?.IdTipoPagoNavigation;
                    return new HojaRutaParadaProductoDto
                    {
                        Id = p.Id,
                        IdProducto = p.IdProducto,
                        Producto = p.IdProductoNavigation?.Nombre ?? $"Producto #{p.IdProducto}",
                        Abreviatura = string.IsNullOrWhiteSpace(p.IdProductoNavigation?.Abreviatura)
                            ? null
                            : p.IdProductoNavigation!.Abreviatura!.Trim(),
                        Cantidad = p.Cantidad,
                        IdListaPrecio = p.IdListaPrecio,
                        ListaPrecio = p.IdListaPrecioNavigation?.Nombre,
                        IdTipoPago = tipo?.Id ?? p.IdListaPrecioNavigation?.IdTipoPago,
                        TipoPago = tipo?.Nombre,
                        TipoPagoCodigo = tipo?.Codigo,
                        PrecioVenta = p.PrecioVenta,
                        PrecioEfectivo = precioEfectivo,
                        PrecioTransferencia = precioTransf
                    };
                })
                .ToList();
        }

        /// <summary>
        /// Calcula abonos Efectivo/Transferencia según el tipo de pago de la lista
        /// asignada a cada producto (fallback por nombre si aún no hay IdTipoPago).
        /// </summary>
        private static (decimal Efectivo, decimal Transferencia) CalcularAbonosProductos(
            IReadOnlyList<HojaRutaParadaProductoDto> productos,
            IReadOnlyDictionary<string, int>? listasPorToken = null)
        {
            if (productos == null || productos.Count == 0)
                return (0, 0);

            int idEf = 0, idTr = 0;
            if (listasPorToken != null)
            {
                if (listasPorToken.TryGetValue("efectivo", out var ef)) idEf = ef;
                if (listasPorToken.TryGetValue("transf", out var tr)) idTr = tr;
            }

            decimal efectivo = 0;
            decimal transferencia = 0;
            foreach (var p in productos)
            {
                var importe = Math.Round(p.Cantidad * p.PrecioVenta, 2);
                if (importe == 0) continue;

                var codigo = (p.TipoPagoCodigo ?? "").Trim();
                if (EsCodigoEfectivo(codigo))
                {
                    efectivo += importe;
                    continue;
                }
                if (EsCodigoTransferencia(codigo))
                {
                    transferencia += importe;
                    continue;
                }

                var idLista = p.IdListaPrecio ?? 0;
                if (idEf > 0 && idLista == idEf)
                {
                    efectivo += importe;
                    continue;
                }
                if (idTr > 0 && idLista == idTr)
                {
                    transferencia += importe;
                    continue;
                }

                var nom = (p.ListaPrecio ?? "").Trim().ToLowerInvariant();
                if (nom.Contains("efect"))
                    efectivo += importe;
                else if (nom.Contains("transf") || nom.Contains("banco") || nom.Contains("transfer"))
                    transferencia += importe;
            }

            return (efectivo, transferencia);
        }

        private static bool EsCodigoEfectivo(string codigo)
            => !string.IsNullOrWhiteSpace(codigo)
               && codigo.Contains("efect", StringComparison.OrdinalIgnoreCase);

        private static bool EsCodigoTransferencia(string codigo)
            => !string.IsNullOrWhiteSpace(codigo)
               && (codigo.Contains("transf", StringComparison.OrdinalIgnoreCase)
                   || codigo.Contains("banco", StringComparison.OrdinalIgnoreCase));

        /// <summary>
        /// Misma regla que ClientesOperativoRepository: fechas ganan; si no hay fechas, estado "Licencia".
        /// </summary>
        private static bool EstaEnLicencia(Cliente cliente, DateTime fecha)
            => EstaEnLicencia(cliente.FechaLicenciaDesde, cliente.FechaLicenciaHasta, cliente.IdEstadoNavigation?.Nombre, fecha);

        private static bool EstaEnLicencia(DateTime? desde, DateTime? hasta, string? estadoNombre, DateTime fecha)
        {
            var porEstado = (estadoNombre ?? "").Contains("Licencia", StringComparison.OrdinalIgnoreCase);
            var d = desde?.Date;
            var h = hasta?.Date;

            if (d.HasValue && h.HasValue)
                return fecha >= d.Value && fecha <= h.Value;

            if (d.HasValue && !h.HasValue)
                return fecha >= d.Value;

            if (!d.HasValue && h.HasValue)
                return fecha <= h.Value;

            return porEstado;
        }

        private static decimal ResolverPrecioLista(
            int idProducto,
            int? idLista,
            IReadOnlyDictionary<(int IdProducto, int IdListaPrecio), decimal> precios,
            decimal fallback)
        {
            if (idLista is > 0 && precios.TryGetValue((idProducto, idLista.Value), out var precio))
                return precio;
            return fallback;
        }

        private static string? FormatearProductosResumen(IReadOnlyList<HojaRutaParadaProductoDto> productos)
        {
            if (productos == null || productos.Count == 0)
                return null;

            var partes = productos.Select(p =>
            {
                var abrev = !string.IsNullOrWhiteSpace(p.Abreviatura)
                    ? p.Abreviatura.Trim()
                    : (string.IsNullOrWhiteSpace(p.Producto) ? "PROD" : p.Producto.Trim());
                var cant = p.Cantidad % 1 == 0
                    ? ((int)p.Cantidad).ToString()
                    : p.Cantidad.ToString("0.####");
                return $"{cant} {abrev} x $ {p.PrecioVenta:N0}";
            });

            return string.Join(" · ", partes);
        }

        private async Task<(
            Dictionary<(int IdProducto, int IdListaPrecio), decimal> Precios,
            Dictionary<string, int> ListasPorToken)> ObtenerPreciosProductoPorLista(IReadOnlyList<int> idsProductos)
        {
            var precios = new Dictionary<(int, int), decimal>();
            var listasPorToken = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            if (idsProductos == null || idsProductos.Count == 0)
            {
                var todasVacias = await _db.ListasPrecios.AsNoTracking()
                    .Include(l => l.IdTipoPagoNavigation)
                    .Select(l => new { l.Id, l.Nombre, TipoCodigo = l.IdTipoPagoNavigation != null ? l.IdTipoPagoNavigation.Codigo : null })
                    .ToListAsync();
                RegistrarTokensLista(todasVacias.Select(l => (l.Id, l.Nombre, l.TipoCodigo)), listasPorToken);
                return (precios, listasPorToken);
            }

            var rows = await (
                from pp in _db.ProductosPrecios.AsNoTracking()
                join lp in _db.ListasPrecios.AsNoTracking() on pp.IdListaPrecio equals lp.Id
                join tp in _db.TiposPagos.AsNoTracking() on lp.IdTipoPago equals tp.Id into tps
                from tp in tps.DefaultIfEmpty()
                where idsProductos.Contains(pp.IdProducto)
                select new
                {
                    pp.IdProducto,
                    pp.IdListaPrecio,
                    pp.PrecioVenta,
                    Lista = lp.Nombre,
                    TipoCodigo = tp != null ? tp.Codigo : null
                }).ToListAsync();

            foreach (var row in rows)
            {
                precios[(row.IdProducto, row.IdListaPrecio)] = row.PrecioVenta;
                RegistrarTokenLista(row.IdListaPrecio, row.Lista, listasPorToken, row.TipoCodigo);
            }

            if (!listasPorToken.ContainsKey("efectivo") || !listasPorToken.ContainsKey("transf"))
            {
                var todas = await _db.ListasPrecios.AsNoTracking()
                    .Include(l => l.IdTipoPagoNavigation)
                    .Select(l => new { l.Id, l.Nombre, TipoCodigo = l.IdTipoPagoNavigation != null ? l.IdTipoPagoNavigation.Codigo : null })
                    .ToListAsync();
                RegistrarTokensLista(todas.Select(l => (l.Id, l.Nombre, l.TipoCodigo)), listasPorToken);
            }

            return (precios, listasPorToken);
        }

        private static void RegistrarTokensLista(IEnumerable<(int Id, string? Nombre, string? TipoCodigo)> listas, Dictionary<string, int> dest)
        {
            foreach (var (id, nombre, tipoCodigo) in listas)
                RegistrarTokenLista(id, nombre, dest, tipoCodigo);
        }

        private static void RegistrarTokenLista(int idLista, string? nombre, Dictionary<string, int> dest, string? tipoCodigo = null)
        {
            if (!string.IsNullOrWhiteSpace(tipoCodigo))
            {
                if (EsCodigoEfectivo(tipoCodigo) && !dest.ContainsKey("efectivo"))
                    dest["efectivo"] = idLista;
                if (EsCodigoTransferencia(tipoCodigo) && !dest.ContainsKey("transf"))
                    dest["transf"] = idLista;
                return;
            }

            var n = (nombre ?? "").Trim();
            if (string.IsNullOrWhiteSpace(n)) return;

            if (n.Contains("efectivo", StringComparison.OrdinalIgnoreCase)
                && !dest.ContainsKey("efectivo"))
                dest["efectivo"] = idLista;

            if ((n.Contains("transf", StringComparison.OrdinalIgnoreCase)
                 || n.Contains("transfer", StringComparison.OrdinalIgnoreCase))
                && !dest.ContainsKey("transf"))
                dest["transf"] = idLista;
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

            if (!string.IsNullOrWhiteSpace(establecimiento.DiasHorarios))
                return establecimiento.DiasHorarios.Trim();

            if (establecimiento.HorarioRecoleccionDesde == default
                && establecimiento.HorarioRecoleccionHasta == default)
                return "";

            return $"{establecimiento.HorarioRecoleccionDesde:hh\\:mm} a {establecimiento.HorarioRecoleccionHasta:hh\\:mm}";
        }

        private async Task<(decimal grande, decimal chico)> ObtenerPreciosDescartadoresReferencia()
        {
            try
            {
                var marcados = await _db.Productos.AsNoTracking()
                    .Where(p => p.Activo && (p.EsDescartadorChicoHojaRuta || p.EsDescartadorGrandeHojaRuta))
                    .Select(p => new { p.Id, p.EsDescartadorChicoHojaRuta, p.EsDescartadorGrandeHojaRuta })
                    .ToListAsync();

                var idChico = marcados.FirstOrDefault(p => p.EsDescartadorChicoHojaRuta)?.Id;
                var idGrande = marcados.FirstOrDefault(p => p.EsDescartadorGrandeHojaRuta)?.Id;
                var ids = new[] { idChico, idGrande }.Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();

                if (ids.Count == 0)
                    return (0, 0);

                var precios = await _db.ProductosPrecios.AsNoTracking()
                    .Where(pp => ids.Contains(pp.IdProducto) && pp.PrecioVenta > 0)
                    .GroupBy(pp => pp.IdProducto)
                    .Select(g => new { IdProducto = g.Key, Precio = g.Max(x => x.PrecioVenta) })
                    .ToListAsync();

                decimal Resolver(int? id) =>
                    id.HasValue
                        ? (precios.FirstOrDefault(p => p.IdProducto == id.Value)?.Precio ?? 0)
                        : 0;

                return (Resolver(idGrande), Resolver(idChico));
            }
            catch
            {
                return (0, 0);
            }
        }

        public async Task<List<RecorridoSugeridoDto>> ListarSugeridosPorRecoleccion(int idCamion, int idSemana, int idDia)
        {
            var enRuta = await _db.ClientesRecorridos.AsNoTracking()
                .Where(r => r.IdCamion == idCamion && r.IdSemana == idSemana && r.IdDia == idDia)
                .Select(r => new { r.IdCliente, r.IdEstablecimiento })
                .ToListAsync();

            var enRutaEstIds = enRuta
                .Where(r => r.IdEstablecimiento is > 0)
                .Select(r => r.IdEstablecimiento!.Value)
                .Distinct()
                .ToList();
            var enRutaCliSinEst = enRuta
                .Where(r => r.IdEstablecimiento == null || r.IdEstablecimiento <= 0)
                .Select(r => r.IdCliente)
                .Distinct()
                .ToList();

            var raw = await (
                from e in _db.ClientesEstablecimientos.AsNoTracking()
                join c in _db.Clientes.AsNoTracking() on e.IdCliente equals c.Id
                where e.IdSemanaRecoleccion == idSemana
                   && e.IdDiaRecoleccion == idDia
                   && (e.IdCamion == null || e.IdCamion == idCamion)
                   && c.Activo
                   && !enRutaEstIds.Contains(e.Id)
                   && !enRutaCliSinEst.Contains(e.IdCliente)
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
                    Localidad = e.Localidad,
                    e.DiasHorarios,
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
                Horario = !string.IsNullOrWhiteSpace(x.DiasHorarios)
                    ? x.DiasHorarios.Trim()
                    : (x.HorarioRecoleccionDesde == default && x.HorarioRecoleccionHasta == default
                        ? ""
                        : $"{x.HorarioRecoleccionDesde:hh\\:mm} a {x.HorarioRecoleccionHasta:hh\\:mm}"),
                YaEnRecorrido = false
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

                var posicionesOcupadas = await _db.ClientesRecorridos
                    .Where(r => r.IdCamion == idCamion && r.IdSemana == idSemana && r.IdDia == idDia)
                    .Select(r => r.Posicion)
                    .ToListAsync();
                var ocupadas = new HashSet<int>(posicionesOcupadas);

                var estIds = items
                    .Where(x => x.IdEstablecimiento.HasValue && x.IdEstablecimiento > 0)
                    .Select(x => x.IdEstablecimiento!.Value)
                    .Distinct()
                    .ToList();

                var ordenPorEst = estIds.Count == 0
                    ? new Dictionary<int, int?>()
                    : await _db.ClientesEstablecimientos
                        .AsNoTracking()
                        .Where(e => estIds.Contains(e.Id))
                        .ToDictionaryAsync(e => e.Id, e => e.OrdenRecorrido);

                var itemsOrdenados = items
                    .Select(item =>
                    {
                        int? orden = null;
                        if (item.IdEstablecimiento.HasValue && item.IdEstablecimiento > 0
                            && ordenPorEst.TryGetValue(item.IdEstablecimiento.Value, out var o))
                        {
                            orden = o;
                        }

                        return new { Item = item, Orden = orden };
                    })
                    .OrderBy(x => x.Orden.HasValue ? 0 : 1)
                    .ThenBy(x => x.Orden ?? int.MaxValue)
                    .ThenBy(x => x.Item.IdCliente)
                    .ToList();

                var pos = maxPos;
                var insertados = 0;
                var ahora = DateTime.Now;

                foreach (var entry in itemsOrdenados)
                {
                    var item = entry.Item;
                    if (EstaEnRecorrido(item.IdCliente, item.IdEstablecimiento, enRutaPairs))
                        continue;

                    int posicion;
                    if (entry.Orden.HasValue && entry.Orden > 0 && !ocupadas.Contains(entry.Orden.Value))
                    {
                        posicion = entry.Orden.Value;
                    }
                    else
                    {
                        pos++;
                        posicion = pos;
                    }

                    ocupadas.Add(posicion);

                    var entity = new ClientesRecorrido
                    {
                        IdCliente = item.IdCliente,
                        IdEstablecimiento = item.IdEstablecimiento > 0 ? item.IdEstablecimiento : null,
                        IdCamion = idCamion,
                        IdSemana = idSemana,
                        IdDia = idDia,
                        Posicion = posicion,
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
                   join est in _db.ClientesEstados on cl.IdEstado equals est.Id into estj
                   from est in estj.DefaultIfEmpty()
                   select new ClientesRecorridoDto
                   {
                       Id = r.Id,
                       IdCliente = r.IdCliente,
                       Cliente = cl.Nombre,
                       IdEstablecimiento = r.IdEstablecimiento,
                       Establecimiento = e != null ? e.Nombre : null,
                       Domicilio = (e != null ? e.Domicilio : null) ?? cl.Domicilio,
                       Localidad = e != null ? e.Localidad : null,
                       IdCamion = r.IdCamion,
                       Camion = c.Nombre,
                       IdSemana = r.IdSemana,
                       Semana = s.Nombre,
                       IdDia = r.IdDia,
                       Dia = d.Nombre,
                       Zona = m != null ? m.Zona : "",
                       Posicion = r.Posicion,
                       Activo = r.Activo,
                       Reprogramado = r.Reprogramado,
                       FechaLicenciaDesde = cl.FechaLicenciaDesde,
                       FechaLicenciaHasta = cl.FechaLicenciaHasta,
                       Observacion = r.Observacion,
                       RecorridoTexto = s.Nombre + " " + d.Nombre,
                       EnLicencia = false,
                       EstadoNombre = est != null ? est.Nombre : null
                   };
        }

        public async Task<(bool Ok, string Error)> SyncEstablecimientoEnRecorridos(int idEstablecimiento, int idUsuario)
        {
            if (idEstablecimiento <= 0)
                return (false, "Establecimiento inválido.");

            try
            {
                var est = await _db.ClientesEstablecimientos.AsNoTracking()
                    .FirstOrDefaultAsync(e => e.Id == idEstablecimiento);
                if (est == null)
                    return (false, "Establecimiento no encontrado.");

                var idSemana = est.IdSemanaRecoleccion;
                var orden = est.OrdenRecorrido;
                var desired = new List<(int IdCamion, int IdSemana, int IdDia)>();

                if (idSemana > 0)
                {
                    if (est.IdCamion is > 0 && est.IdDiaRecoleccion > 0)
                        desired.Add((est.IdCamion.Value, idSemana, est.IdDiaRecoleccion));

                    var diasExtra = await _db.ClientesEstablecimientosDias.AsNoTracking()
                        .Where(d =>
                            d.IdEstablecimiento == idEstablecimiento &&
                            d.IdDia > 0 &&
                            d.IdCamion != null &&
                            d.IdCamion > 0)
                        .Select(d => new { d.IdDia, IdCamion = d.IdCamion!.Value })
                        .ToListAsync();

                    foreach (var d in diasExtra)
                    {
                        if (!desired.Any(x =>
                                x.IdCamion == d.IdCamion &&
                                x.IdSemana == idSemana &&
                                x.IdDia == d.IdDia))
                        {
                            desired.Add((d.IdCamion, idSemana, d.IdDia));
                        }
                    }
                }

                desired = desired
                    .GroupBy(x => (x.IdCamion, x.IdSemana, x.IdDia))
                    .Select(g => g.First())
                    .ToList();

                var existentes = await _db.ClientesRecorridos
                    .Where(r => r.IdEstablecimiento == idEstablecimiento)
                    .ToListAsync();

                var desiredKeys = new HashSet<(int, int, int)>(
                    desired.Select(d => (d.IdCamion, d.IdSemana, d.IdDia)));

                var aEliminar = existentes
                    .Where(r => !desiredKeys.Contains((r.IdCamion, r.IdSemana, r.IdDia)))
                    .ToList();
                if (aEliminar.Count > 0)
                    _db.ClientesRecorridos.RemoveRange(aEliminar);

                var ahora = DateTime.Now;
                var idUsuarioSafe = idUsuario > 0 ? idUsuario : est.IdUsuarioRegistra;

                foreach (var slot in desired)
                {
                    var actual = existentes.FirstOrDefault(r =>
                        r.IdCamion == slot.IdCamion &&
                        r.IdSemana == slot.IdSemana &&
                        r.IdDia == slot.IdDia);

                    var posicion = await ResolverPosicionRecorridoAsync(
                        slot.IdCamion,
                        slot.IdSemana,
                        slot.IdDia,
                        orden,
                        actual?.Id);

                    if (actual != null)
                    {
                        var cambio = false;
                        if (actual.IdCliente != est.IdCliente)
                        {
                            actual.IdCliente = est.IdCliente;
                            cambio = true;
                        }

                        if (orden is > 0 && actual.Posicion != posicion)
                        {
                            actual.Posicion = posicion;
                            cambio = true;
                        }

                        if (!actual.Activo)
                        {
                            actual.Activo = true;
                            cambio = true;
                        }

                        if (cambio)
                        {
                            actual.IdUsuarioModifica = idUsuarioSafe;
                            actual.FechaUsuarioModifica = ahora;
                        }
                    }
                    else
                    {
                        _db.ClientesRecorridos.Add(new ClientesRecorrido
                        {
                            IdCliente = est.IdCliente,
                            IdEstablecimiento = idEstablecimiento,
                            IdCamion = slot.IdCamion,
                            IdSemana = slot.IdSemana,
                            IdDia = slot.IdDia,
                            Posicion = posicion,
                            Activo = true,
                            IdUsuarioRegistra = idUsuarioSafe,
                            FechaUsuarioRegistra = ahora
                        });
                    }
                }

                await _db.SaveChangesAsync();
                return (true, "");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        public async Task EliminarPorEstablecimiento(int idEstablecimiento)
        {
            if (idEstablecimiento <= 0) return;

            var rows = await _db.ClientesRecorridos
                .Where(r => r.IdEstablecimiento == idEstablecimiento)
                .ToListAsync();
            if (rows.Count == 0) return;

            _db.ClientesRecorridos.RemoveRange(rows);
            await _db.SaveChangesAsync();
        }

        public async Task EliminarPorCliente(int idCliente)
        {
            if (idCliente <= 0) return;

            var rows = await _db.ClientesRecorridos
                .Where(r => r.IdCliente == idCliente)
                .ToListAsync();
            if (rows.Count == 0) return;

            _db.ClientesRecorridos.RemoveRange(rows);
            await _db.SaveChangesAsync();
        }

        private async Task AsegurarPosicionClientesRecorrido(ClientesRecorrido model)
        {
            if (model.Posicion > 0) return;
            if (model.IdCamion <= 0 || model.IdSemana <= 0 || model.IdDia <= 0) return;

            int? orden = null;
            if (model.IdEstablecimiento is > 0)
            {
                orden = await _db.ClientesEstablecimientos.AsNoTracking()
                    .Where(e => e.Id == model.IdEstablecimiento.Value)
                    .Select(e => e.OrdenRecorrido)
                    .FirstOrDefaultAsync();
            }

            model.Posicion = await ResolverPosicionRecorridoAsync(
                model.IdCamion,
                model.IdSemana,
                model.IdDia,
                orden,
                model.Id > 0 ? model.Id : null);
        }

        /// <summary>
        /// Si la posición destino ya está ocupada, corre +1 a ese cliente y a todos los de ahí para abajo.
        /// </summary>
        private async Task DesplazarPosicionesSiOcupada(ClientesRecorrido model, int? idExcluir)
        {
            if (model.Posicion <= 0 || model.IdCamion <= 0 || model.IdSemana <= 0 || model.IdDia <= 0)
                return;

            var query = _db.ClientesRecorridos
                .Where(r => r.IdCamion == model.IdCamion
                    && r.IdSemana == model.IdSemana
                    && r.IdDia == model.IdDia
                    && r.Posicion >= model.Posicion);

            if (idExcluir is > 0)
                query = query.Where(r => r.Id != idExcluir.Value);

            var ocupada = await query.AnyAsync(r => r.Posicion == model.Posicion);
            if (!ocupada)
                return;

            var aMover = await query
                .OrderByDescending(r => r.Posicion)
                .ToListAsync();

            foreach (var row in aMover)
                row.Posicion += 1;
        }

        private async Task<int> ResolverPosicionRecorridoAsync(
            int idCamion,
            int idSemana,
            int idDia,
            int? ordenDeseado,
            int? idExcluir)
        {
            var query = _db.ClientesRecorridos.AsNoTracking()
                .Where(r => r.IdCamion == idCamion && r.IdSemana == idSemana && r.IdDia == idDia);

            if (idExcluir is > 0)
                query = query.Where(r => r.Id != idExcluir.Value);

            var ocupadas = await query.Select(r => r.Posicion).ToListAsync();
            var set = new HashSet<int>(ocupadas);

            if (ordenDeseado is > 0 && !set.Contains(ordenDeseado.Value))
                return ordenDeseado.Value;

            return (ocupadas.Count == 0 ? 0 : ocupadas.Max()) + 1;
        }

        private async Task CargarProductosEnClientesRecorrido(List<ClientesRecorridoDto> list)
        {
            if (list == null || list.Count == 0)
                return;

            var idsEst = list
                .Where(x => x.IdEstablecimiento is > 0)
                .Select(x => x.IdEstablecimiento!.Value)
                .Distinct()
                .ToList();

            if (idsEst.Count == 0)
                return;

            var productos = await _db.ClientesEstablecimientosProductos.AsNoTracking()
                .Where(p => idsEst.Contains(p.IdEstablecimiento))
                .Select(p => new
                {
                    p.Id,
                    p.IdEstablecimiento,
                    p.IdProducto,
                    Producto = p.IdProductoNavigation != null ? p.IdProductoNavigation.Nombre : null,
                    Abreviatura = p.IdProductoNavigation != null ? p.IdProductoNavigation.Abreviatura : null,
                    p.Cantidad,
                    p.IdListaPrecio,
                    ListaPrecio = p.IdListaPrecioNavigation != null ? p.IdListaPrecioNavigation.Nombre : null,
                    p.PrecioVenta
                })
                .ToListAsync();

            var idsProducto = productos.Select(p => p.IdProducto).Distinct().ToList();
            var (precios, tokens) = await ObtenerPreciosProductoPorLista(idsProducto);

            int? idEf = tokens.TryGetValue("efectivo", out var ef) ? ef : null;
            int? idTr = tokens.TryGetValue("transf", out var tr) ? tr : null;

            var byEst = productos
                .GroupBy(p => p.IdEstablecimiento)
                .ToDictionary(g => g.Key, g => g
                    .OrderBy(x => x.Producto ?? "")
                    .ThenBy(x => x.ListaPrecio ?? "")
                    .ThenBy(x => x.Id)
                    .ToList());

            foreach (var item in list)
            {
                if (item.IdEstablecimiento is not > 0)
                    continue;

                if (!byEst.TryGetValue(item.IdEstablecimiento.Value, out var rows))
                    continue;

                item.Productos = rows.Select(p =>
                {
                    var precioEf = ResolverPrecioLista(p.IdProducto, idEf, precios, p.PrecioVenta);
                    var precioTr = ResolverPrecioLista(p.IdProducto, idTr, precios, p.PrecioVenta);
                    var precioLista = ResolverPrecioLista(p.IdProducto, p.IdListaPrecio, precios, p.PrecioVenta);
                    return new HojaRutaParadaProductoDto
                    {
                        Id = p.Id,
                        IdProducto = p.IdProducto,
                        Producto = p.Producto ?? $"Producto #{p.IdProducto}",
                        Abreviatura = string.IsNullOrWhiteSpace(p.Abreviatura)
                            ? null
                            : p.Abreviatura.Trim(),
                        Cantidad = p.Cantidad,
                        IdListaPrecio = p.IdListaPrecio,
                        ListaPrecio = p.ListaPrecio,
                        PrecioVenta = p.PrecioVenta,
                        PrecioEfectivo = precioEf,
                        PrecioTransferencia = precioTr,
                        PrecioLista = precioLista
                    };
                }).ToList();
            }
        }

        public async Task<int> ObtenerSiguienteNumeroManifiesto(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos)
        {
            if (recorridos == null || recorridos.Count == 0)
                return 1;

            try
            {
                var semanas = recorridos.Select(r => r.IdSemana).Distinct().ToList();
                var dias = recorridos.Select(r => r.IdDia).Distinct().ToList();
                var pares = recorridos.ToHashSet();

                var ultimos = await _db.RecorridosManifiestosContador.AsNoTracking()
                    .Where(x => x.IdCamion == idCamion && semanas.Contains(x.IdSemana) && dias.Contains(x.IdDia))
                    .Select(x => new { x.IdSemana, x.IdDia, x.UltimoNumero })
                    .ToListAsync();

                var max = ultimos
                    .Where(x => pares.Contains((x.IdSemana, x.IdDia)))
                    .Select(x => (int?)x.UltimoNumero)
                    .DefaultIfEmpty()
                    .Max();

                return (max ?? 0) + 1;
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
                return 1;
            }
        }

        public async Task<(bool Ok, string Error)> RegistrarUltimoNumeroManifiesto(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            int ultimoNumero,
            int idUsuario)
        {
            if (recorridos == null || recorridos.Count == 0)
                return (false, "Recorrido inválido.");

            try
            {
                foreach (var (idSemana, idDia) in recorridos.Distinct())
                {
                    var row = await _db.RecorridosManifiestosContador
                        .FirstOrDefaultAsync(x =>
                            x.IdCamion == idCamion &&
                            x.IdSemana == idSemana &&
                            x.IdDia == idDia);

                    if (row == null)
                    {
                        _db.RecorridosManifiestosContador.Add(new RecorridosManifiestoContador
                        {
                            IdCamion = idCamion,
                            IdSemana = idSemana,
                            IdDia = idDia,
                            UltimoNumero = ultimoNumero,
                            IdUsuarioModifica = idUsuario > 0 ? idUsuario : null,
                            FechaUsuarioModifica = DateTime.Now
                        });
                    }
                    else
                    {
                        row.UltimoNumero = Math.Max(row.UltimoNumero, ultimoNumero);
                        row.IdUsuarioModifica = idUsuario > 0 ? idUsuario : row.IdUsuarioModifica;
                        row.FechaUsuarioModifica = DateTime.Now;
                    }
                }

                await _db.SaveChangesAsync();
                return (true, "");
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
                return (false, "Falta la tabla RecorridosManifiestosContador. Ejecute el script 023 en la base de datos.");
            }
            catch (Exception ex)
            {
                return (false, "No se pudo guardar el número de manifiesto. " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        public async Task<ManifiestosHojaDto?> ObtenerManifiestos(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            int numeroInicial,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null,
            int? idRecorrido = null)
        {
            if (recorridos == null || recorridos.Count == 0)
                return null;

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

            var excluir = idsRecorridoExcluir is { Count: > 0 }
                ? new HashSet<int>(idsRecorridoExcluir)
                : null;

            var items = new List<ManifiestoItemDto>();

            foreach (var (idSemana, idDia) in recorridosOrdenados)
            {
                var filas = await _db.ClientesRecorridos.AsNoTracking()
                    .Include(r => r.IdClienteNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdLocalidadNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.ClientesEstablecimientosContactos)
                    .Where(r =>
                        r.IdCamion == idCamion &&
                        r.IdSemana == idSemana &&
                        r.IdDia == idDia)
                    .OrderBy(r => r.Posicion)
                    .ToListAsync();

                if (excluir != null)
                    filas = filas.Where(r => !excluir.Contains(r.Id)).ToList();

                if (idRecorrido is > 0)
                    filas = filas.Where(r => r.Id == idRecorrido.Value).ToList();

                foreach (var r in filas)
                    items.Add(MapearItemManifiesto(r));
            }

            if (items.Count == 0)
                return null;

            var numero = numeroInicial > 0 ? numeroInicial : 1;
            foreach (var item in items)
            {
                item.Numero = numero;
                numero++;
            }

            var unico = recorridosOrdenados.Count == 1 ? recorridosOrdenados[0] : (0, 0);

            return new ManifiestosHojaDto
            {
                IdCamion = idCamion,
                IdSemana = unico.Item1,
                IdDia = unico.Item2,
                RecorridosParam = string.Join(",", recorridosOrdenados.Select(r => $"{r.IdSemana}_{r.IdDia}")),
                Titulo = camion.Nombre,
                NumeroInicial = numeroInicial > 0 ? numeroInicial : 1,
                Items = items
            };
        }

        public async Task<ArchivoIntercambioDto?> ObtenerArchivoIntercambio(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            DateTime fecha,
            int numeroInicial,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null,
            int? idRecorrido = null,
            string? nombre = null,
            bool mesCompleto = false,
            IReadOnlyCollection<int>? idsRecorridoIncluir = null)
        {
            var camion = await _db.Camiones.AsNoTracking().FirstOrDefaultAsync(c => c.Id == idCamion);
            if (camion == null)
                return null;

            var semanasOrden = await _db.Semanas.AsNoTracking().OrderBy(s => s.Id).Select(s => s.Id).ToListAsync();
            var diasOrden = await _db.Dias.AsNoTracking().OrderBy(d => d.Id).Select(s => s.Id).ToListAsync();

            List<(int IdSemana, int IdDia)> recorridosOrdenados;
            if (mesCompleto)
            {
                var pares = await _db.ClientesRecorridos.AsNoTracking()
                    .Where(r => r.IdCamion == idCamion)
                    .Select(r => new { r.IdSemana, r.IdDia })
                    .Distinct()
                    .ToListAsync();

                recorridosOrdenados = pares
                    .Select(p => (p.IdSemana, p.IdDia))
                    .Distinct()
                    .OrderBy(r => semanasOrden.IndexOf(r.IdSemana))
                    .ThenBy(r => diasOrden.IndexOf(r.IdDia))
                    .ToList();
            }
            else
            {
                if (recorridos == null || recorridos.Count == 0)
                    return null;

                recorridosOrdenados = recorridos
                    .Distinct()
                    .OrderBy(r => semanasOrden.IndexOf(r.IdSemana))
                    .ThenBy(r => diasOrden.IndexOf(r.IdDia))
                    .ToList();
            }

            if (recorridosOrdenados.Count == 0)
                return null;

            var incluir = idsRecorridoIncluir is { Count: > 0 }
                ? new HashSet<int>(idsRecorridoIncluir)
                : null;
            var excluir = incluir == null && idsRecorridoExcluir is { Count: > 0 }
                ? new HashSet<int>(idsRecorridoExcluir)
                : null;

            var items = new List<ArchivoIntercambioItemDto>();

            foreach (var (idSemana, idDia) in recorridosOrdenados)
            {
                var filas = await _db.ClientesRecorridos.AsNoTracking()
                    .Include(r => r.IdClienteNavigation)
                        .ThenInclude(c => c!.IdTipoGeneradorNavigation)
                    .Include(r => r.IdClienteNavigation)
                        .ThenInclude(c => c!.IdCondicionIvaNavigation)
                    .Include(r => r.IdClienteNavigation)
                        .ThenInclude(c => c!.IdProvinciaNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdLocalidadNavigation)
                            .ThenInclude(l => l!.IdProvinciaNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdLocalidadNavigation)
                            .ThenInclude(l => l!.IdPartidoNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdPartidoNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdProvinciaNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdTipoGeneradorNavigation)
                    .Include(r => r.IdEstablecimientoNavigation)
                        .ThenInclude(e => e!.IdCondicionIvaNavigation)
                    .Where(r =>
                        r.IdCamion == idCamion &&
                        r.IdSemana == idSemana &&
                        r.IdDia == idDia)
                    .OrderBy(r => r.Posicion)
                    .ToListAsync();

                if (incluir != null)
                    filas = filas.Where(r => incluir.Contains(r.Id)).ToList();
                else
                {
                    if (excluir != null)
                        filas = filas.Where(r => !excluir.Contains(r.Id)).ToList();

                    if (idRecorrido is > 0)
                        filas = filas.Where(r => r.Id == idRecorrido.Value).ToList();
                }

                foreach (var r in filas)
                    items.Add(MapearItemIntercambio(r));
            }

            if (items.Count == 0)
                return null;

            var numero = numeroInicial > 0 ? numeroInicial : 1;
            foreach (var item in items)
            {
                item.NumeroManifiesto = numero;
                numero++;
            }

            var fechaTxt = fecha.Date == default ? DateTime.Today : fecha.Date;

            var nombreArchivo = !string.IsNullOrWhiteSpace(nombre)
                ? ArchivoIntercambioNombre(nombre, fechaTxt)
                : mesCompleto
                    ? ArchivoIntercambioNombre($"MES_{camion.Nombre}", fechaTxt)
                    : items.Count == 1
                        ? ArchivoIntercambioNombre(items[0].RazonSocial, fechaTxt)
                        : ArchivoIntercambioNombre(camion.Nombre, fechaTxt);

            return new ArchivoIntercambioDto
            {
                NombreArchivo = nombreArchivo,
                Fecha = fechaTxt,
                NumeroInicial = numeroInicial > 0 ? numeroInicial : 1,
                RecorridosParam = string.Join(",", recorridosOrdenados.Select(r => $"{r.IdSemana}_{r.IdDia}")),
                Items = items
            };
        }

        public async Task<GuardarHistorialManifiestoResultDto> GuardarHistorialManifiestos(
            int idCamion,
            ManifiestosHojaDto model,
            string nombre,
            int idUsuario)
        {
            var result = new GuardarHistorialManifiestoResultDto();
            if (idCamion <= 0 || model?.Items == null || model.Items.Count == 0)
                return result;

            try
            {
                var pares = model.Items
                    .Select(x => (x.IdSemana, x.IdDia))
                    .Where(x => x.IdSemana > 0 && x.IdDia > 0)
                    .Distinct()
                    .ToList();

                var zonas = new Dictionary<(int, int), string>();
                if (pares.Count > 0)
                {
                    var semanas = pares.Select(p => p.IdSemana).Distinct().ToList();
                    var dias = pares.Select(p => p.IdDia).Distinct().ToList();
                    var filasZona = await _db.RecorridosMatriz.AsNoTracking()
                        .Where(z => z.IdCamion == idCamion && semanas.Contains(z.IdSemana) && dias.Contains(z.IdDia))
                        .Select(z => new { z.IdSemana, z.IdDia, z.Zona })
                        .ToListAsync();
                    foreach (var z in filasZona)
                        zonas[(z.IdSemana, z.IdDia)] = (z.Zona ?? "").Trim();
                }

                var loteNombre = (nombre ?? "").Trim();
                var ahora = DateTime.Now;
                var entidades = new List<RecorridoManifiesto>();

                foreach (var item in model.Items)
                {
                    zonas.TryGetValue((item.IdSemana, item.IdDia), out var zona);
                    var nombreItem = loteNombre;
                    if (string.IsNullOrWhiteSpace(nombreItem))
                        nombreItem = (item.RazonSocial ?? "").Trim();
                    if (nombreItem.Length > 120)
                        nombreItem = nombreItem[..120];

                    var ent = new RecorridoManifiesto
                    {
                        IdCamion = idCamion,
                        IdSemana = item.IdSemana > 0 ? item.IdSemana : null,
                        IdDia = item.IdDia > 0 ? item.IdDia : null,
                        IdClienteRecorrido = item.IdRecorrido > 0 ? item.IdRecorrido : null,
                        IdCliente = item.IdCliente,
                        IdEstablecimiento = item.IdEstablecimientoDb,
                        Numero = item.Numero,
                        Nombre = nombreItem,
                        RazonSocial = Truncar(item.RazonSocial, 200),
                        Cuit = Truncar(item.Cuit, 30),
                        IdEstablecimientoCliente = Truncar(item.IdEstablecimiento, 40),
                        Direccion = Truncar(item.Direccion, 250),
                        Localidad = Truncar(item.Localidad, 120),
                        Telefono = Truncar(item.Telefono, 40),
                        Cantidad = Truncar(item.Cantidad, 40),
                        Zona = Truncar(zona, 120),
                        FechaGeneracion = ahora,
                        IdUsuario = idUsuario > 0 ? idUsuario : null
                    };
                    entidades.Add(ent);
                    _db.RecorridosManifiestos.Add(ent);
                }

                await _db.SaveChangesAsync();

                result.Items = entidades.Select(e => new HistorialManifiestoGuardadoDto
                {
                    Id = e.Id,
                    Numero = e.Numero,
                    IdCliente = e.IdCliente,
                    IdEstablecimientoDb = e.IdEstablecimiento
                }).ToList();
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
            }

            return result;
        }

        public async Task<ManifiestosCamionDto> ListarManifiestosPorCamion(int idCamion)
        {
            var camion = await _db.Camiones.AsNoTracking().FirstOrDefaultAsync(c => c.Id == idCamion);
            var dto = new ManifiestosCamionDto
            {
                IdCamion = idCamion,
                Camion = camion?.Nombre ?? "",
                SiguienteNumero = 1
            };

            if (idCamion <= 0)
                return dto;

            try
            {
                var filas = await _db.RecorridosManifiestos.AsNoTracking()
                    .Include(x => x.IdSemanaNavigation)
                    .Include(x => x.IdDiaNavigation)
                    .Include(x => x.IdUsuarioNavigation)
                    .Where(x => x.IdCamion == idCamion)
                    .OrderByDescending(x => x.FechaGeneracion)
                    .ThenByDescending(x => x.Numero)
                    .ToListAsync();

                dto.Items = filas.Select(x => new ManifiestoHistorialDto
                {
                    Id = x.Id,
                    IdCamion = x.IdCamion,
                    Numero = x.Numero,
                    Nombre = x.Nombre ?? "",
                    RazonSocial = x.RazonSocial ?? "",
                    Zona = x.Zona ?? "",
                    Localidad = x.Localidad ?? "",
                    Recorrido = ArmarRecorridoLabel(x.IdSemanaNavigation?.Nombre, x.IdDiaNavigation?.Nombre, x.Zona),
                    Cuit = x.Cuit ?? "",
                    Cantidad = x.Cantidad ?? "",
                    FechaGeneracion = x.FechaGeneracion,
                    Usuario = x.IdUsuarioNavigation?.Usuario ?? ""
                }).ToList();

                dto.Total = dto.Items.Count;
                dto.UltimaFecha = dto.Items.Count > 0 ? dto.Items[0].FechaGeneracion : null;
                var maxHist = dto.Items.Count > 0 ? dto.Items.Max(x => x.Numero) : 0;
                var maxContador = await _db.RecorridosManifiestosContador.AsNoTracking()
                    .Where(x => x.IdCamion == idCamion)
                    .Select(x => (int?)x.UltimoNumero)
                    .MaxAsync() ?? 0;
                dto.UltimoNumero = Math.Max(maxHist, maxContador);
                dto.SiguienteNumero = dto.UltimoNumero + 1;
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
                dto.SiguienteNumero = await ObtenerSiguienteNumeroManifiestoCamion(idCamion);
            }

            return dto;
        }

        public async Task<ManifiestosHojaDto?> ObtenerManifiestosHistorial(int idCamion, IReadOnlyList<int> ids)
        {
            if (idCamion <= 0 || ids == null || ids.Count == 0)
                return null;

            try
            {
                var idSet = ids.Where(x => x > 0).Distinct().ToList();
                var filas = await _db.RecorridosManifiestos.AsNoTracking()
                    .Where(x => x.IdCamion == idCamion && idSet.Contains(x.Id))
                    .OrderBy(x => x.Numero)
                    .ThenBy(x => x.Id)
                    .ToListAsync();

                if (filas.Count == 0)
                    return null;

                var idsClientes = filas.Where(x => x.IdCliente.HasValue).Select(x => x.IdCliente!.Value).Distinct().ToList();
                var idsEst = filas.Where(x => x.IdEstablecimiento.HasValue).Select(x => x.IdEstablecimiento!.Value).Distinct().ToList();
                var clientes = idsClientes.Count > 0
                    ? await _db.Clientes.AsNoTracking().Where(c => idsClientes.Contains(c.Id)).ToDictionaryAsync(c => c.Id)
                    : new Dictionary<int, Cliente>();
                var ests = idsEst.Count > 0
                    ? await _db.ClientesEstablecimientos.AsNoTracking()
                        .Include(e => e.IdLocalidadNavigation)
                        .Where(e => idsEst.Contains(e.Id))
                        .ToDictionaryAsync(e => e.Id)
                    : new Dictionary<int, ClientesEstablecimiento>();

                var camion = await _db.Camiones.AsNoTracking().FirstOrDefaultAsync(c => c.Id == idCamion);
                var items = filas.Select(x =>
                {
                    clientes.TryGetValue(x.IdCliente ?? 0, out var cli);
                    ClientesEstablecimiento? est = null;
                    if (x.IdEstablecimiento.HasValue)
                        ests.TryGetValue(x.IdEstablecimiento.Value, out est);

                    var localidad = (x.Localidad ?? "").Trim();
                    if (string.IsNullOrWhiteSpace(localidad))
                        localidad = (est?.Localidad ?? est?.IdLocalidadNavigation?.Nombre ?? "").Trim();

                    return new ManifiestoItemDto
                    {
                        IdRecorrido = x.IdClienteRecorrido ?? 0,
                        IdCliente = x.IdCliente,
                        IdEstablecimientoDb = x.IdEstablecimiento,
                        IdSemana = x.IdSemana ?? 0,
                        IdDia = x.IdDia ?? 0,
                        Numero = x.Numero,
                        IdEstablecimiento = x.IdEstablecimientoCliente ?? "",
                        RazonSocial = x.RazonSocial ?? "",
                        Cuit = x.Cuit ?? "",
                        Direccion = x.Direccion ?? "",
                        Localidad = localidad.ToUpperInvariant(),
                        Telefono = x.Telefono ?? "",
                        Domicilio = x.Direccion ?? "",
                        Cantidad = x.Cantidad ?? "",
                        Calle = (est?.Calle ?? cli?.Calle ?? "").Trim(),
                        NumeroCalle = (est?.Numero ?? cli?.Numero ?? "").Trim(),
                        Piso = (est?.PisoDepartamento ?? cli?.PisoDepartamento ?? "").Trim()
                    };
                }).ToList();

                var nombre = filas.Count == 1
                    ? (filas[0].RazonSocial ?? filas[0].Nombre)
                    : (filas[0].Nombre ?? camion?.Nombre ?? "Manifiestos");

                return new ManifiestosHojaDto
                {
                    IdCamion = idCamion,
                    IdSemana = filas[0].IdSemana ?? 0,
                    IdDia = filas[0].IdDia ?? 0,
                    Titulo = nombre ?? "",
                    Nombre = nombre ?? "",
                    FechaProgramacion = filas[0].FechaGeneracion == default
                        ? DateTime.Today
                        : filas[0].FechaGeneracion.Date,
                    NumeroInicial = items[0].Numero,
                    Items = items
                };
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
                return null;
            }
        }

        public async Task<List<RecorridoOpcionManifiestoDto>> ListarRutasManifiestoCamion(int idCamion)
        {
            if (idCamion <= 0)
                return new List<RecorridoOpcionManifiestoDto>();

            var semanas = await _db.Semanas.AsNoTracking().OrderBy(s => s.Id).ToListAsync();
            var dias = await _db.Dias.AsNoTracking().OrderBy(d => d.Id).ToListAsync();
            var semanaNom = semanas.ToDictionary(s => s.Id, s => s.Nombre ?? "");
            var diaNom = dias.ToDictionary(d => d.Id, d => d.Nombre ?? "");

            var conteos = await _db.ClientesRecorridos.AsNoTracking()
                .Where(r => r.IdCamion == idCamion)
                .GroupBy(r => new { r.IdSemana, r.IdDia })
                .Select(g => new { g.Key.IdSemana, g.Key.IdDia, Cantidad = g.Count() })
                .ToListAsync();

            if (conteos.Count == 0)
                return new List<RecorridoOpcionManifiestoDto>();

            var semanasIds = conteos.Select(c => c.IdSemana).Distinct().ToList();
            var diasIds = conteos.Select(c => c.IdDia).Distinct().ToList();
            var zonas = await _db.RecorridosMatriz.AsNoTracking()
                .Where(z => z.IdCamion == idCamion && semanasIds.Contains(z.IdSemana) && diasIds.Contains(z.IdDia))
                .Select(z => new { z.IdSemana, z.IdDia, z.Zona })
                .ToListAsync();
            var zonaMap = zonas.ToDictionary(z => (z.IdSemana, z.IdDia), z => (z.Zona ?? "").Trim());

            return conteos
                .OrderBy(c => semanas.FindIndex(s => s.Id == c.IdSemana))
                .ThenBy(c => dias.FindIndex(d => d.Id == c.IdDia))
                .Select(c =>
                {
                    zonaMap.TryGetValue((c.IdSemana, c.IdDia), out var zona);
                    var semana = semanaNom.GetValueOrDefault(c.IdSemana, "");
                    var dia = diaNom.GetValueOrDefault(c.IdDia, "");
                    var label = string.IsNullOrWhiteSpace(zona)
                        ? $"{semana} · {dia}".Trim(' ', '·')
                        : $"{zona} · {semana} {dia}".Trim();
                    return new RecorridoOpcionManifiestoDto
                    {
                        IdSemana = c.IdSemana,
                        IdDia = c.IdDia,
                        Semana = semana,
                        Dia = dia,
                        Zona = zona ?? "",
                        Label = $"{label} ({c.Cantidad})",
                        CantidadClientes = c.Cantidad
                    };
                })
                .ToList();
        }

        public async Task<int> ObtenerSiguienteNumeroManifiestoCamion(int idCamion)
        {
            if (idCamion <= 0)
                return 1;

            try
            {
                var maxContador = await _db.RecorridosManifiestosContador.AsNoTracking()
                    .Where(x => x.IdCamion == idCamion)
                    .Select(x => (int?)x.UltimoNumero)
                    .MaxAsync() ?? 0;
                var maxHist = 0;
                try
                {
                    maxHist = await _db.RecorridosManifiestos.AsNoTracking()
                        .Where(x => x.IdCamion == idCamion)
                        .Select(x => (int?)x.Numero)
                        .MaxAsync() ?? 0;
                }
                catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
                {
                }

                return Math.Max(maxContador, maxHist) + 1;
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
                return 1;
            }
        }

        public async Task<(bool Ok, string Error)> EliminarManifiestoHistorial(int idCamion, int id)
        {
            if (idCamion <= 0 || id <= 0)
                return (false, "Manifiesto inválido.");

            try
            {
                var row = await _db.RecorridosManifiestos
                    .FirstOrDefaultAsync(x => x.Id == id && x.IdCamion == idCamion);

                if (row == null)
                    return (false, "No se encontró el manifiesto.");

                _db.RecorridosManifiestos.Remove(row);
                await _db.SaveChangesAsync();
                return (true, "");
            }
            catch (Exception ex) when (EsTablaManifiestoFaltante(ex))
            {
                return (false, "Falta la tabla RecorridosManifiestos. Ejecute el script 025 en la base de datos.");
            }
            catch (Exception ex)
            {
                return (false, "No se pudo eliminar el manifiesto. " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        private static string ArmarRecorridoLabel(string? semana, string? dia, string? zona)
        {
            var z = (zona ?? "").Trim();
            var s = (semana ?? "").Trim();
            var d = (dia ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(z))
                return string.IsNullOrWhiteSpace($"{s} {d}".Trim()) ? z : $"{z} · {s} {d}".Trim();
            return $"{s} {d}".Trim();
        }

        private static string? Truncar(string? valor, int max)
        {
            var txt = (valor ?? "").Trim();
            if (txt.Length == 0) return null;
            return txt.Length > max ? txt[..max] : txt;
        }

        private static string ArchivoIntercambioNombre(string? camion, DateTime fecha)
        {
            var unidad = (camion ?? "").Trim();
            foreach (var c in Path.GetInvalidFileNameChars())
                unidad = unidad.Replace(c, '_');
            unidad = unidad.Replace(' ', '_');
            if (unidad.Length == 0)
                unidad = "UNIDAD";
            if (unidad.Length > 40)
                unidad = unidad[..40];
            return $"INTERCAMBIO_{unidad}_{fecha:yyyyMMdd}.txt";
        }

        private static ArchivoIntercambioItemDto MapearItemIntercambio(ClientesRecorrido recorrido)
        {
            var cliente = recorrido.IdClienteNavigation;
            var est = recorrido.IdEstablecimientoNavigation;
            var cuit = PrimerValor(est?.Cuit, cliente?.Cuit);
            var calle = PrimerValor(est?.Calle, cliente?.Calle, est?.Domicilio, cliente?.Domicilio);
            var numero = PrimerValor(est?.Numero, cliente?.Numero);
            var localidad = est?.IdLocalidadNavigation;
            var partido = est?.IdPartidoNavigation ?? localidad?.IdPartidoNavigation;
            var provincia = est?.IdProvinciaNavigation
                ?? localidad?.IdProvinciaNavigation
                ?? cliente?.IdProvinciaNavigation;
            var tipoGen = est?.IdTipoGeneradorNavigation ?? cliente?.IdTipoGeneradorNavigation;
            var iva = est?.IdCondicionIvaNavigation ?? cliente?.IdCondicionIvaNavigation;

            return new ArchivoIntercambioItemDto
            {
                NumeroCliente = cliente?.NumeroCliente ?? 0,
                CodigoOpds = (est?.IdEstablecimientoCliente ?? "").Trim(),
                RazonSocial = (cliente?.Nombre ?? "").Trim(),
                Calle = calle,
                NumeroCalle = numero,
                CodigoPostal = PrimerValor(est?.CodPostal, cliente?.CodPostal),
                CodigoLocalidad = (localidad?.Codigo ?? "").Trim(),
                CodigoPartido = (partido?.Codigo ?? "").Trim(),
                NombreProvincia = (provincia?.Nombre ?? "").Trim(),
                Cuit = cuit,
                NombreIva = (iva?.Nombre ?? "").Trim(),
                CodigoTipoGenerador = (tipoGen?.Codigo ?? "").Trim(),
                Kilos = est?.Kilos ?? 0
            };
        }

        private static string PrimerValor(params string?[] valores)
        {
            foreach (var v in valores)
            {
                if (!string.IsNullOrWhiteSpace(v))
                    return v.Trim();
            }
            return "";
        }

        private static ManifiestoItemDto MapearItemManifiesto(ClientesRecorrido recorrido)
        {
            var cliente = recorrido.IdClienteNavigation;
            var est = recorrido.IdEstablecimientoNavigation;
            var cuit = !string.IsNullOrWhiteSpace(est?.Cuit) ? est!.Cuit : cliente?.Cuit;
            var localidad = (est?.Localidad ?? "").Trim();
            if (string.IsNullOrWhiteSpace(localidad))
                localidad = (est?.IdLocalidadNavigation?.Nombre ?? "").Trim();

            return new ManifiestoItemDto
            {
                IdRecorrido = recorrido.Id,
                IdCliente = recorrido.IdCliente,
                IdEstablecimientoDb = recorrido.IdEstablecimiento,
                IdSemana = recorrido.IdSemana,
                IdDia = recorrido.IdDia,
                Posicion = recorrido.Posicion,
                RazonSocial = (cliente?.Nombre ?? "").Trim(),
                Cuit = FormatearCuitManifiesto(cuit),
                IdEstablecimiento = (est?.IdEstablecimientoCliente ?? "").Trim(),
                Direccion = FormatearDireccionManifiesto(
                    est?.Calle ?? cliente?.Calle,
                    est?.Numero ?? cliente?.Numero,
                    est?.PisoDepartamento ?? cliente?.PisoDepartamento,
                    est?.Domicilio ?? cliente?.Domicilio),
                Localidad = localidad.ToUpperInvariant(),
                Telefono = cliente == null ? "" : ObtenerTelefonoParada(cliente, est),
                Domicilio = FormatearDomicilioManifiesto(
                    est?.Calle ?? cliente?.Calle,
                    est?.Numero ?? cliente?.Numero,
                    est?.PisoDepartamento ?? cliente?.PisoDepartamento,
                    localidad,
                    est?.Domicilio ?? cliente?.Domicilio),
                Cantidad = FormatearKilosManifiesto(est?.Kilos),
                Calle = (est?.Calle ?? cliente?.Calle ?? "").Trim(),
                NumeroCalle = (est?.Numero ?? cliente?.Numero ?? "").Trim(),
                Piso = (est?.PisoDepartamento ?? cliente?.PisoDepartamento ?? "").Trim()
            };
        }

        private static string FormatearDireccionManifiesto(
            string? calle,
            string? numero,
            string? piso,
            string? legacy)
        {
            var calleTxt = (calle ?? "").Trim();
            var numeroTxt = (numero ?? "").Trim();
            var pisoTxt = (piso ?? "").Trim();

            if (!string.IsNullOrWhiteSpace(calleTxt) && !string.IsNullOrWhiteSpace(numeroTxt))
            {
                var dir = $"{calleTxt.ToUpperInvariant()} Nº : {numeroTxt}";
                if (!string.IsNullOrWhiteSpace(pisoTxt))
                    dir += $" Piso: {pisoTxt}";
                return dir;
            }

            return ComponerDomicilio(calle, numero, piso, legacy).ToUpperInvariant();
        }

        private static string FormatearCuitManifiesto(string? cuit)
        {
            var raw = (cuit ?? "").Trim();
            var digits = new string(raw.Where(char.IsDigit).ToArray());
            if (digits.Length == 11)
                return $"{digits[..2]}-{digits[2..10]}/{digits[10]}";
            return raw;
        }

        private static string FormatearDomicilioManifiesto(
            string? calle,
            string? numero,
            string? piso,
            string? localidad,
            string? legacy)
        {
            var loc = (localidad ?? "").Trim().ToUpperInvariant();
            var calleTxt = (calle ?? "").Trim();
            var numeroTxt = (numero ?? "").Trim();
            var pisoTxt = (piso ?? "").Trim();

            if (!string.IsNullOrWhiteSpace(calleTxt) && !string.IsNullOrWhiteSpace(numeroTxt))
            {
                var pisoPart = string.IsNullOrWhiteSpace(pisoTxt) ? "" : $" Piso: {pisoTxt}";
                var dir = $"{calleTxt.ToUpperInvariant()} Nº: {numeroTxt}{pisoPart}";
                return string.IsNullOrWhiteSpace(loc) ? dir + "." : $"{dir}, {loc}.";
            }

            var compuesto = ComponerDomicilio(calle, numero, piso, legacy);
            if (string.IsNullOrWhiteSpace(compuesto))
                return string.IsNullOrWhiteSpace(loc) ? "" : loc + ".";

            var texto = compuesto.ToUpperInvariant();
            return string.IsNullOrWhiteSpace(loc) ? texto + "." : $"{texto}, {loc}.";
        }

        private static string FormatearKilosManifiesto(decimal? kilos)
        {
            if (!kilos.HasValue || kilos.Value <= 0)
                return "";

            var valor = kilos.Value;
            var numero = valor % 1 == 0
                ? ((int)valor).ToString()
                : valor.ToString("0.##");
            return numero;
        }

        private static bool EsTablaManifiestoFaltante(Exception ex)
        {
            var msg = (ex.InnerException?.Message ?? ex.Message) ?? "";
            if (!msg.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase))
                return false;
            return msg.Contains("RecorridosManifiestosContador", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("RecorridosManifiestos", StringComparison.OrdinalIgnoreCase);
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
