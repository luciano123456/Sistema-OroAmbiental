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

            // Clientes en licencia no salen en la hoja (siguen en el recorrido para cuando vuelvan).
            items = items
                .Where(r => r.IdClienteNavigation == null || !EstaEnLicencia(r.IdClienteNavigation, fecha.Date))
                .ToList();

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
        {
            var estado = cliente.IdEstadoNavigation?.Nombre ?? "";
            var porEstado = estado.Contains("Licencia", StringComparison.OrdinalIgnoreCase);

            var desde = cliente.FechaLicenciaDesde?.Date;
            var hasta = cliente.FechaLicenciaHasta?.Date;

            if (desde.HasValue && hasta.HasValue)
                return fecha >= desde.Value && fecha <= hasta.Value;

            if (desde.HasValue && !hasta.HasValue)
                return fecha >= desde.Value;

            if (!desde.HasValue && hasta.HasValue)
                return fecha <= hasta.Value;

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
                var lista = string.IsNullOrWhiteSpace(p.ListaPrecio) ? "" : $" ({p.ListaPrecio.Trim()})";
                return $"{cant} {abrev}{lista} x $ {p.PrecioVenta:N0}";
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
                       Observacion = r.Observacion,
                       RecorridoTexto = s.Nombre + " " + d.Nombre
                   };
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
                .Include(p => p.IdProductoNavigation)
                .Include(p => p.IdListaPrecioNavigation)
                .Where(p => idsEst.Contains(p.IdEstablecimiento))
                .ToListAsync();

            var idsProducto = productos.Select(p => p.IdProducto).Distinct().ToList();
            var (precios, tokens) = await ObtenerPreciosProductoPorLista(idsProducto);

            int? idEf = tokens.TryGetValue("efectivo", out var ef) ? ef : null;
            int? idTr = tokens.TryGetValue("transf", out var tr) ? tr : null;

            var byEst = productos
                .GroupBy(p => p.IdEstablecimiento)
                .ToDictionary(g => g.Key, g => g
                    .OrderBy(x => x.IdProductoNavigation?.Nombre ?? "")
                    .ThenBy(x => x.IdListaPrecioNavigation?.Nombre ?? "")
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
                        PrecioVenta = p.PrecioVenta,
                        PrecioEfectivo = precioEf,
                        PrecioTransferencia = precioTr
                    };
                }).ToList();
            }
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
