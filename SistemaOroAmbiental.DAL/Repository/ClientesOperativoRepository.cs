using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public class ClientesOperativoRepository : IClientesOperativoRepository
    {
        public const int TIPO_ENTREGA = ClientesEntregasRepository.TIPO_LINEA_ENTREGA;
        public const int TIPO_RETIRO = ClientesEntregasRepository.TIPO_LINEA_RETIRO;

        private static readonly string[] MesesNombres =
        {
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        };

        private readonly SistemaOroAmbientalContext _db;

        public ClientesOperativoRepository(SistemaOroAmbientalContext context)
        {
            _db = context;
        }

        private static bool EstadoContiene(string? nombre, string patron)
            => !string.IsNullOrWhiteSpace(nombre) &&
               nombre.Contains(patron, StringComparison.OrdinalIgnoreCase);

        private static bool EsBaja(Cliente cliente)
            => EstadoContiene(cliente.IdEstadoNavigation?.Nombre, "Baja");

        private static bool EsSuspendido(Cliente cliente)
            => EstadoContiene(cliente.IdEstadoNavigation?.Nombre, "SUSPEND");

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

        private static bool EsActivoOperativo(Cliente cliente, DateTime hoy)
        {
            if (!cliente.Activo) return false;
            if (EsBaja(cliente) || EsSuspendido(cliente)) return false;
            if (EstaEnLicencia(cliente, hoy)) return false;
            return true;
        }

        private static bool LicenciaPorVencer(Cliente cliente, DateTime hoy, DateTime limite)
            => EstaEnLicencia(cliente, hoy) &&
               cliente.FechaLicenciaHasta.HasValue &&
               cliente.FechaLicenciaHasta.Value.Date >= hoy &&
               cliente.FechaLicenciaHasta.Value.Date <= limite;

        public async Task<ClientesDashboardDto> ObtenerDashboard()
        {
            var clientes = await _db.Clientes
                .AsNoTracking()
                .Include(c => c.IdEstadoNavigation)
                .ToListAsync();

            var hoy = DateTime.Today;
            var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);
            var finMes = inicioMes.AddMonths(1).AddTicks(-1);
            var limiteLicencia = hoy.AddDays(31);

            var dto = new ClientesDashboardDto
            {
                Total = clientes.Count,
                Activos = clientes.Count(c => EsActivoOperativo(c, hoy)),
                Suspendidos = clientes.Count(c => EsSuspendido(c)),
                Baja = clientes.Count(c => EsBaja(c)),
                Licencia = clientes.Count(c => EstaEnLicencia(c, hoy)),
                StockClientesActivos = clientes.Count(c => EsActivoOperativo(c, hoy)),
                BajasMesActual = clientes.Count(c =>
                    EsBaja(c) &&
                    c.FechaUsuarioModifica.HasValue &&
                    c.FechaUsuarioModifica.Value >= inicioMes &&
                    c.FechaUsuarioModifica.Value <= finMes),
                LicenciasPorVencer = clientes.Count(c => LicenciaPorVencer(c, hoy, limiteLicencia))
            };

            var desdeBajas = inicioMes.AddMonths(-11);
            dto.BajasPorMes = clientes
                .Where(c =>
                    EsBaja(c) &&
                    c.FechaUsuarioModifica.HasValue &&
                    c.FechaUsuarioModifica.Value >= desdeBajas)
                .GroupBy(c => new
                {
                    c.FechaUsuarioModifica!.Value.Year,
                    c.FechaUsuarioModifica.Value.Month
                })
                .Select(g => new ClientesBajaMesDto
                {
                    Anio = g.Key.Year,
                    Mes = g.Key.Month,
                    MesNombre = MesesNombres[g.Key.Month],
                    Cantidad = g.Count()
                })
                .OrderBy(x => x.Anio)
                .ThenBy(x => x.Mes)
                .ToList();

            dto.AlertasLicencia = clientes
                .Where(c => LicenciaPorVencer(c, hoy, limiteLicencia))
                .Select(c => new ClienteLicenciaAlertaDto
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    FechaLicenciaHasta = c.FechaLicenciaHasta,
                    DiasRestantes = (c.FechaLicenciaHasta!.Value.Date - hoy).Days
                })
                .OrderBy(x => x.FechaLicenciaHasta)
                .ToList();

            return dto;
        }

        public async Task<ClienteControlAnualDto?> ObtenerControlAnual(int idCliente, int anio)
        {
            var filtrado = await ObtenerControlMensualFiltrado(
                idCliente,
                new List<int> { anio },
                Enumerable.Range(1, 12).ToList(),
                null);

            if (filtrado == null)
                return null;

            return new ClienteControlAnualDto
            {
                Anio = anio,
                IdCliente = filtrado.IdCliente,
                Cliente = filtrado.Cliente,
                NumeroCliente = filtrado.NumeroCliente,
                StockActual = filtrado.StockActual,
                TotalDebe = filtrado.TotalDebe,
                TotalHaber = filtrado.TotalHaber,
                TotalSaldo = filtrado.TotalSaldo,
                Meses = filtrado.Filas,
                Recorridos = filtrado.Recorridos
            };
        }

        public async Task<ClienteControlFiltradoDto?> ObtenerControlMensualFiltrado(
            int idCliente,
            IReadOnlyList<int> anios,
            IReadOnlyList<int> meses,
            IReadOnlyList<int>? idsEstablecimiento = null)
        {
            var cliente = await _db.Clientes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == idCliente);

            if (cliente == null)
                return null;

            var aniosNorm = (anios ?? Array.Empty<int>())
                .Where(a => a >= 2000 && a <= 2100)
                .Distinct()
                .OrderByDescending(a => a)
                .ToList();

            var mesesNorm = (meses ?? Array.Empty<int>())
                .Where(m => m is >= 1 and <= 12)
                .Distinct()
                .OrderBy(m => m)
                .ToList();

            if (!aniosNorm.Any())
                aniosNorm.Add(DateTime.Now.Year);
            if (!mesesNorm.Any())
                mesesNorm = Enumerable.Range(1, 12).ToList();

            var idsEst = (idsEstablecimiento ?? Array.Empty<int>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();
            var filtrarEst = idsEst.Count > 0;
            var idEstUnico = idsEst.Count == 1 ? idsEst[0] : (int?)null;
            var datosParciales = false;

            List<ClientesEntrega> entregas = new();
            try
            {
                var queryEntregas = _db.ClientesEntregas
                    .AsNoTracking()
                    .Include(e => e.ClientesEntregasProductos)
                        .ThenInclude(p => p.IdProductoNavigation)
                    .Include(e => e.ClientesEntregasProductos)
                        .ThenInclude(p => p.IdListaPrecioNavigation)
                    .Include(e => e.IdEstablecimientoNavigation)
                    .Include(e => e.IdContratoNavigation)
                    .Where(e =>
                        e.IdCliente == idCliente &&
                        aniosNorm.Contains(e.Fecha.Year));

                if (filtrarEst)
                {
                    // Preferir IdEstablecimiento; si falta (legado), usar el del contrato.
                    queryEntregas = queryEntregas.Where(e =>
                        idsEst.Contains(e.IdEstablecimiento)
                        || (e.IdEstablecimiento <= 0
                            && e.IdContratoNavigation != null
                            && idsEst.Contains(e.IdContratoNavigation.IdEstablecimiento)));
                }

                entregas = await queryEntregas.ToListAsync();
            }
            catch
            {
                datosParciales = true;
            }

            var overrides = new Dictionary<(int Anio, int Mes), ClientesControlMensual>();
            try
            {
                var itemsQuery = _db.ClientesControlMensuales
                    .AsNoTracking()
                    .Where(c =>
                        c.IdCliente == idCliente &&
                        aniosNorm.Contains(c.Anio) &&
                        mesesNorm.Contains(c.Mes));

                if (filtrarEst)
                    itemsQuery = itemsQuery.Where(c =>
                        c.IdEstablecimiento != null &&
                        idsEst.Contains(c.IdEstablecimiento.Value));
                else
                    itemsQuery = itemsQuery.Where(c => c.IdEstablecimiento == null);

                var items = await itemsQuery.ToListAsync();
                overrides = items
                    .GroupBy(c => (c.Anio, c.Mes))
                    .ToDictionary(
                        g => g.Key,
                        g => FusionarOverridesControl(g.ToList()));
            }
            catch
            {
                datosParciales = true;
            }

            // Cuenta corriente e intereses:
            // - Vista cliente: planilla con CC completa.
            // - Vista por establecimiento: cobros vinculados a entregas de ese/esos est.
            //   (No se trae toda la CC: un est nuevo no debe heredar deuda de otro.)
            List<ClientesCuentaCorrienteMovimiento> movimientosCc = new();
            try
            {
                if (!filtrarEst)
                {
                    var cc = await _db.ClientesCuentaCorrientes
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.IdCliente == idCliente);

                    if (cc != null)
                    {
                        movimientosCc = await _db.ClientesCuentaCorrienteMovimientos
                            .AsNoTracking()
                            .Where(m => m.IdCuentaCorriente == cc.Id)
                            .ToListAsync();
                    }
                }
                else if (entregas.Count > 0)
                {
                    var idsEntregaEst = entregas.Select(e => e.Id).Distinct().ToList();
                    var idsCobro = await _db.ClientesCobros
                        .AsNoTracking()
                        .Where(c => c.IdEntrega != null && idsEntregaEst.Contains(c.IdEntrega.Value))
                        .Select(c => c.Id)
                        .ToListAsync();

                    if (idsCobro.Count > 0)
                    {
                        movimientosCc = await _db.ClientesCuentaCorrienteMovimientos
                            .AsNoTracking()
                            .Where(m =>
                                m.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE &&
                                idsCobro.Contains(m.IdMovimiento))
                            .ToListAsync();
                    }
                }
            }
            catch
            {
                datosParciales = true;
            }

            var recorridos = new List<ClientesRecorridoDto>();
            try
            {
                recorridos = await ListarRecorridosCliente(idCliente);
                if (filtrarEst)
                    recorridos = recorridos
                        .Where(r => r.IdEstablecimiento.HasValue && idsEst.Contains(r.IdEstablecimiento.Value))
                        .ToList();
            }
            catch
            {
                datosParciales = true;
            }

            decimal stockTotal = 0;
            try
            {
                stockTotal = await CalcularStockUnidadesCliente(idCliente, filtrarEst ? idsEst : null);
            }
            catch
            {
                datosParciales = true;
            }

            var filas = new List<ClienteControlMensualDto>();

            var periodos = aniosNorm
                .SelectMany(a => mesesNorm.Select(m => (Anio: a, Mes: m)))
                .OrderBy(p => p.Anio)
                .ThenBy(p => p.Mes)
                .ToList();

            foreach (var p in periodos)
            {
                filas.Add(ConstruirFilaControlMensual(
                    p.Anio,
                    p.Mes,
                    entregas,
                    overrides,
                    movimientosCc));
            }

            decimal saldoAcumulado = 0;
            var intereses = MapearInteresesCliente(movimientosCc);
            if (periodos.Count > 0)
            {
                var primero = periodos[0];
                var inicio = new DateTime(primero.Anio, primero.Mes, 1);
                var periodosSet = periodos.Select(p => (p.Anio, p.Mes)).ToHashSet();

                // En vista por establecimiento el saldo arranca en 0 (solo meses del filtro).
                // Los cobros previos no deben restar sin los cargos de esos meses.
                saldoAcumulado = filtrarEst
                    ? 0
                    : movimientosCc
                        .Where(m => m.Fecha < inicio)
                        .Sum(m => m.Debe - m.Haber);

                if (!filtrarEst)
                {
                    var interesesReasignados = intereses
                        .Where(i =>
                            i.AnioRef.HasValue &&
                            i.MesRef.HasValue &&
                            periodosSet.Contains((i.AnioRef.Value, i.MesRef.Value)) &&
                            i.Fecha < inicio)
                        .Sum(i => i.Importe);
                    saldoAcumulado -= interesesReasignados;
                }
            }

            var filasCronologicas = filas.OrderBy(f => f.Anio).ThenBy(f => f.Mes).ToList();
            AsignarInteresesAFilas(filasCronologicas, intereses);

            decimal totalDebe = 0;
            decimal totalHaber = 0;
            foreach (var fila in filasCronologicas)
            {
                // Total / restante del mes (después de asignar intereses).
                // Saldo = acumulado histórico; no confundir con restante del mes.
                fila.TotalMes = fila.Debe + fila.TotalIntereses;
                fila.RestanteMes = fila.TotalMes - fila.Haber;
                totalDebe += fila.TotalMes;
                totalHaber += fila.Haber;
                saldoAcumulado += fila.RestanteMes;
                fila.Saldo = saldoAcumulado;
            }

            var filasOrdenadas = aniosNorm
                .SelectMany(a => mesesNorm.Select(m => filas.First(f => f.Anio == a && f.Mes == m)))
                .ToList();

            var productosColumnas = await ConstruirProductosColumnas(idCliente, filasOrdenadas, filtrarEst ? idsEst : null);

            return new ClienteControlFiltradoDto
            {
                IdCliente = idCliente,
                IdEstablecimiento = idEstUnico,
                Cliente = cliente.Nombre,
                NumeroCliente = cliente.NumeroCliente,
                StockActual = stockTotal,
                TotalDebe = totalDebe,
                TotalHaber = totalHaber,
                TotalSaldo = saldoAcumulado,
                DatosParciales = datosParciales,
                Filas = filasOrdenadas,
                Recorridos = recorridos,
                Intereses = intereses,
                ProductosColumnas = productosColumnas
            };
        }

        private static ClientesControlMensual FusionarOverridesControl(List<ClientesControlMensual> items)
        {
            if (items.Count == 1)
                return items[0];

            var primero = items[0];
            return new ClientesControlMensual
            {
                Id = primero.Id,
                IdCliente = primero.IdCliente,
                IdEstablecimiento = items.Count == 1 ? primero.IdEstablecimiento : null,
                Anio = primero.Anio,
                Mes = primero.Mes,
                FechaVisita = items.Where(x => x.FechaVisita.HasValue).Select(x => x.FechaVisita).DefaultIfEmpty().Max(),
                SinEntrega = items.All(x => x.SinEntrega),
                CajasAFavor = items.Sum(x => x.CajasAFavor),
                Observaciones = string.Join(" · ", items
                    .Select(x => x.Observaciones)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()),
                AbonoEfectivo = items.Sum(x => x.AbonoEfectivo),
                AbonoTransferencia = items.Sum(x => x.AbonoTransferencia),
                FechaTransferencia = items.Where(x => x.FechaTransferencia.HasValue).Select(x => x.FechaTransferencia).DefaultIfEmpty().Max()
            };
        }

        private async Task<List<ClienteControlProductoColumnaDto>> ConstruirProductosColumnas(
            int idCliente,
            List<ClienteControlMensualDto> filas,
            IReadOnlyList<int>? idsEstablecimiento = null)
        {
            var mapa = new Dictionary<int, ClienteControlProductoColumnaDto>();

            foreach (var p in filas.SelectMany(f => f.Productos ?? new List<ClienteControlProductoMesDto>()))
            {
                if (p.IdProducto <= 0) continue;
                if (!mapa.ContainsKey(p.IdProducto))
                {
                    mapa[p.IdProducto] = new ClienteControlProductoColumnaDto
                    {
                        IdProducto = p.IdProducto,
                        Nombre = p.Producto,
                        Abreviatura = p.Abreviatura
                    };
                }
            }

            try
            {
                var cepQuery = _db.ClientesEstablecimientosProductos
                    .AsNoTracking()
                    .Include(x => x.IdProductoNavigation)
                    .Include(x => x.IdEstablecimientoNavigation)
                    .Where(x =>
                        x.IdEstablecimientoNavigation.IdCliente == idCliente &&
                        x.IdProductoNavigation != null);

                if (idsEstablecimiento is { Count: > 0 })
                    cepQuery = cepQuery.Where(x => idsEstablecimiento.Contains(x.IdEstablecimiento));

                var cep = await cepQuery.ToListAsync();

                foreach (var row in cep)
                {
                    if (mapa.ContainsKey(row.IdProducto)) continue;
                    mapa[row.IdProducto] = new ClienteControlProductoColumnaDto
                    {
                        IdProducto = row.IdProducto,
                        Nombre = row.IdProductoNavigation?.Nombre ?? $"Producto {row.IdProducto}",
                        Abreviatura = row.IdProductoNavigation?.Abreviatura
                    };
                }
            }
            catch
            {
                // Si falla CEP, igual devolvemos columnas de movimientos.
            }

            return mapa.Values
                .OrderBy(x => x.Nombre)
                .ToList();
        }

        private static List<ClienteInteresMovDto> MapearInteresesCliente(
            List<ClientesCuentaCorrienteMovimiento> movimientosCc)
        {
            return movimientosCc
                .Where(m => string.Equals(
                    m.TipoMovimiento,
                    ClientesCuentaCorrienteRepository.TIPO_INTERES_CLIENTE,
                    StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(m => m.Fecha)
                .ThenByDescending(m => m.Id)
                .Select(m =>
                {
                    var (anioRef, mesRef) = ResolverPeriodoInteres(m);
                    return new ClienteInteresMovDto
                    {
                        Id = m.Id,
                        Fecha = m.Fecha,
                        Concepto = m.Concepto ?? "",
                        Importe = m.Debe,
                        AnioRef = anioRef,
                        MesRef = mesRef,
                        MesNombreRef = mesRef is >= 1 and <= 12 ? MesesNombres[mesRef.Value] : null
                    };
                })
                .ToList();
        }

        private static void AsignarInteresesAFilas(
            List<ClienteControlMensualDto> filas,
            List<ClienteInteresMovDto> intereses)
        {
            foreach (var fila in filas)
            {
                var delMes = intereses
                    .Where(i => i.AnioRef == fila.Anio && i.MesRef == fila.Mes)
                    .OrderByDescending(i => i.Fecha)
                    .ThenByDescending(i => i.Id)
                    .ToList();

                fila.Intereses = delMes;
                fila.CantidadIntereses = delMes.Count;
                fila.TotalIntereses = delMes.Sum(i => i.Importe);
            }
        }

        /// <summary>
        /// Prefiere tag · ref:YYYY-MM en el concepto; si no, busca "MesNombre Año".
        /// </summary>
        private static (int? Anio, int? Mes) ResolverPeriodoInteres(ClientesCuentaCorrienteMovimiento mov)
        {
            var concepto = mov.Concepto ?? "";
            var tag = System.Text.RegularExpressions.Regex.Match(
                concepto,
                @"ref:(\d{4})-(\d{2})",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            if (tag.Success &&
                int.TryParse(tag.Groups[1].Value, out var anioTag) &&
                int.TryParse(tag.Groups[2].Value, out var mesTag) &&
                mesTag is >= 1 and <= 12)
            {
                return (anioTag, mesTag);
            }

            for (var mes = 1; mes <= 12; mes++)
            {
                var nombre = MesesNombres[mes];
                var rx = System.Text.RegularExpressions.Regex.Match(
                    concepto,
                    $@"\b{System.Text.RegularExpressions.Regex.Escape(nombre)}\s+(\d{{4}})\b",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                if (rx.Success && int.TryParse(rx.Groups[1].Value, out var anioNom))
                    return (anioNom, mes);
            }

            // Sin referencia clara: cae en el mes de la fecha del movimiento.
            return (mov.Fecha.Year, mov.Fecha.Month);
        }

        /// <summary>
        /// Importe de línea: SubtotalFinal, o fallback a precio × cantidad si quedó en 0.
        /// </summary>
        private static decimal ImporteLineaControl(ClientesEntregasProducto l)
        {
            if (l.SubtotalFinal != 0)
                return l.SubtotalFinal;

            var precio = l.PrecioVentaFinal != 0 ? l.PrecioVentaFinal : l.PrecioVenta;
            return precio * l.Cantidad;
        }

        private ClienteControlMensualDto ConstruirFilaControlMensual(
            int anio,
            int mes,
            List<ClientesEntrega> entregas,
            Dictionary<(int Anio, int Mes), ClientesControlMensual> overrides,
            List<ClientesCuentaCorrienteMovimiento> movimientosCc)
        {
            var entregasMes = entregas
                .Where(e => e.Fecha.Year == anio && e.Fecha.Month == mes)
                .ToList();

            var lineas = entregasMes.SelectMany(e => e.ClientesEntregasProductos).ToList();

            var lineasEntrega = lineas.Where(l => l.TipoMovimiento == TIPO_ENTREGA).ToList();
            var lineasRetiro = lineas.Where(l => l.TipoMovimiento == TIPO_RETIRO).ToList();

            var entregadas = lineasEntrega.Sum(l => l.Cantidad);
            var retiradas = lineasRetiro.Sum(l => l.Cantidad);
            var subtotalEntregas = lineasEntrega.Sum(ImporteLineaControl);
            var subtotalRetiros = lineasRetiro.Sum(ImporteLineaControl);

            overrides.TryGetValue((anio, mes), out var ov);

            // Abonos de la planilla = solo lo cargado en Control mensual (editable en el modal).
            var abonoEfectivo = ov?.AbonoEfectivo ?? 0;
            var abonoTransferencia = ov?.AbonoTransferencia ?? 0;

            // Fórmula planilla:
            // Debe  = lo que el cliente debe pagar = ENTREGAS + RETIROS (+ ajustes Debe)
            // Haber = cobros/abonos del mes (+ ajustes Haber).
            // Intereses se asignan aparte y el Saldo acumulado los incluye.
            var inicioMes = new DateTime(anio, mes, 1);
            var finMes = inicioMes.AddMonths(1);
            var movsMes = movimientosCc
                .Where(m => m.Fecha >= inicioMes && m.Fecha < finMes)
                .ToList();
            var movsMesSinInteres = movsMes
                .Where(m => !string.Equals(
                    m.TipoMovimiento,
                    ClientesCuentaCorrienteRepository.TIPO_INTERES_CLIENTE,
                    StringComparison.OrdinalIgnoreCase))
                .ToList();

            var cobrosCc = movsMesSinInteres
                .Where(m => m.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE)
                .Sum(m => m.Haber);
            var abonosPlanilla = abonoEfectivo + abonoTransferencia;
            var ajustesDebe = movsMesSinInteres
                .Where(m => m.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_AJUSTE_CLIENTE)
                .Sum(m => m.Debe);
            var ajustesHaber = movsMesSinInteres
                .Where(m => m.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_AJUSTE_CLIENTE)
                .Sum(m => m.Haber);

            var debe = subtotalEntregas + subtotalRetiros + ajustesDebe;
            var haber = Math.Max(abonosPlanilla, cobrosCc) + ajustesHaber;

            // Si no hay abonos en la planilla del est pero sí cobros de la entrega, mostrarlos en columnas.
            var abonoEfMostrar = abonoEfectivo;
            var abonoTrMostrar = abonoTransferencia;
            if (abonosPlanilla <= 0 && cobrosCc > 0)
            {
                abonoTrMostrar = cobrosCc;
            }

            DateTime? fechaVisita = ov?.FechaVisita;
            if (!fechaVisita.HasValue && entregasMes.Count > 0)
                fechaVisita = entregasMes.Max(e => e.Fecha).Date;

            // Una fila por combinación producto + lista/tipo de pago + precio/%desc/%IVA.
            // Si solo cambia la lista o el precio, no se unifican (evita mezclar 3 cajas distintas).
            var productos = lineas
                .Where(l => l.TipoMovimiento == TIPO_ENTREGA || l.TipoMovimiento == TIPO_RETIRO)
                .GroupBy(l => new
                {
                    l.IdProducto,
                    IdListaPrecio = l.IdListaPrecio ?? 0,
                    PrecioVenta = decimal.Round(l.PrecioVenta, 4),
                    PorcDescuento = decimal.Round(l.PorcDescuento, 4),
                    PorcIva = decimal.Round(l.PorcIva, 4),
                    Nombre = l.IdProductoNavigation?.Nombre ?? $"Producto {l.IdProducto}"
                })
                .Select(g =>
                {
                    var ent = g.Where(x => x.TipoMovimiento == TIPO_ENTREGA).ToList();
                    var ret = g.Where(x => x.TipoMovimiento == TIPO_RETIRO).ToList();
                    var cantEnt = ent.Sum(x => x.Cantidad);
                    var cantRet = ret.Sum(x => x.Cantidad);
                    var subEnt = ent.Sum(ImporteLineaControl);
                    var subRet = ret.Sum(ImporteLineaControl);
                    var listaNombre = g.Select(x => x.IdListaPrecioNavigation?.Nombre)
                        .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));
                    return new ClienteControlProductoMesDto
                    {
                        IdProducto = g.Key.IdProducto,
                        Producto = g.Key.Nombre,
                        Abreviatura = g.Select(x => x.IdProductoNavigation?.Abreviatura)
                            .FirstOrDefault(a => !string.IsNullOrWhiteSpace(a)),
                        IdListaPrecio = g.Key.IdListaPrecio > 0 ? g.Key.IdListaPrecio : null,
                        ListaPrecio = listaNombre,
                        Entregadas = cantEnt,
                        Retiradas = cantRet,
                        PrecioUnitarioEntrega = cantEnt > 0 ? subEnt / cantEnt : 0,
                        PrecioUnitarioRetiro = cantRet > 0 ? subRet / cantRet : 0,
                        SubtotalEntregas = subEnt,
                        SubtotalRetiros = subRet
                    };
                })
                .OrderBy(p => p.Producto)
                .ThenBy(p => p.ListaPrecio ?? "")
                .ThenBy(p => p.PrecioUnitarioRetiro)
                .ThenBy(p => p.PrecioUnitarioEntrega)
                .ToList();

            return new ClienteControlMensualDto
            {
                IdControl = ov?.Id,
                Anio = anio,
                Mes = mes,
                MesNombre = MesesNombres[mes],
                FechaVisita = fechaVisita,
                Entregadas = entregadas,
                Retiradas = retiradas,
                StockCliente = entregadas - retiradas,
                SubtotalEntregas = subtotalEntregas,
                SubtotalRetiros = subtotalRetiros,
                AbonoEfectivo = abonoEfMostrar,
                AbonoTransferencia = abonoTrMostrar,
                FechaTransferencia = ov?.FechaTransferencia,
                Debe = debe,
                Haber = haber,
                TotalMes = debe, // + intereses luego en AsignarInteresesAFilas / loop
                RestanteMes = debe - haber,
                Saldo = debe - haber, // se reemplaza luego por saldo acumulado
                CajasAFavor = ov?.CajasAFavor ?? 0,
                SinEntrega = ov?.SinEntrega ?? false,
                Observaciones = ov?.Observaciones,
                TieneOverride = ov != null,
                Productos = productos
            };
        }

        public async Task<List<ClienteStockDto>> ObtenerStockCliente(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null)
        {
            var query = _db.ClientesEntregasProductos
                .AsNoTracking()
                .Include(p => p.IdProductoNavigation)
                .Include(p => p.IdEntregaNavigation)
                    .ThenInclude(e => e.IdContratoNavigation)
                .Where(p =>
                    p.IdEntregaNavigation.IdCliente == idCliente &&
                    (p.TipoMovimiento == TIPO_ENTREGA || p.TipoMovimiento == TIPO_RETIRO));

            if (idsEstablecimiento is { Count: > 0 })
            {
                var ids = idsEstablecimiento.Where(x => x > 0).Distinct().ToList();
                query = query.Where(p =>
                    ids.Contains(p.IdEntregaNavigation.IdEstablecimiento)
                    || (p.IdEntregaNavigation.IdEstablecimiento <= 0
                        && p.IdEntregaNavigation.IdContratoNavigation != null
                        && ids.Contains(p.IdEntregaNavigation.IdContratoNavigation.IdEstablecimiento)));
            }

            var lineas = await query.ToListAsync();

            return lineas
                .GroupBy(p => new { p.IdProducto, Nombre = p.IdProductoNavigation.Nombre })
                .Select(g =>
                {
                    var entregadas = g.Where(x => x.TipoMovimiento == TIPO_ENTREGA).Sum(x => x.Cantidad);
                    var retiradas = g.Where(x => x.TipoMovimiento == TIPO_RETIRO).Sum(x => x.Cantidad);
                    return new ClienteStockDto
                    {
                        IdProducto = g.Key.IdProducto,
                        Producto = g.Key.Nombre,
                        Entregadas = entregadas,
                        Retiradas = retiradas,
                        EnPoderCliente = entregadas - retiradas
                    };
                })
                .Where(x => x.Entregadas > 0 || x.Retiradas > 0)
                .OrderBy(x => x.Producto)
                .ToList();
        }

        public async Task<List<ClienteProductoSugeridoDto>> ObtenerProductosSugeridos(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null)
        {
            var query = _db.ClientesEstablecimientosProductos
                .AsNoTracking()
                .Include(x => x.IdProductoNavigation)
                .Include(x => x.IdListaPrecioNavigation)
                .Include(x => x.IdEstablecimientoNavigation)
                .Where(x => x.IdEstablecimientoNavigation.IdCliente == idCliente);

            if (idsEstablecimiento is { Count: > 0 })
            {
                var ids = idsEstablecimiento.Where(x => x > 0).Distinct().ToList();
                query = query.Where(x => ids.Contains(x.IdEstablecimiento));
            }

            var rows = await query
                .OrderBy(x => x.IdProductoNavigation!.Nombre)
                .ThenBy(x => x.Id)
                .ToListAsync();

            return rows.Select(x => new ClienteProductoSugeridoDto
            {
                IdProducto = x.IdProducto,
                Producto = x.IdProductoNavigation?.Nombre ?? $"Producto {x.IdProducto}",
                Abreviatura = x.IdProductoNavigation?.Abreviatura,
                IdEstablecimiento = x.IdEstablecimiento,
                Establecimiento = x.IdEstablecimientoNavigation?.Nombre,
                Cantidad = x.Cantidad,
                IdListaPrecio = x.IdListaPrecio,
                ListaPrecio = x.IdListaPrecioNavigation?.Nombre,
                PrecioVenta = x.PrecioVenta
            }).ToList();
        }

        public async Task<bool> GuardarControlMensual(ClientesControlMensual model, bool esNuevo, int idUsuario)
        {
            try
            {
                ClientesControlMensual? entity = null;

                if (esNuevo || model.Id <= 0)
                {
                    var idEst = model.IdEstablecimiento is > 0 ? model.IdEstablecimiento : null;
                    entity = await _db.ClientesControlMensuales
                        .FirstOrDefaultAsync(x =>
                            x.IdCliente == model.IdCliente &&
                            x.Anio == model.Anio &&
                            x.Mes == model.Mes &&
                            x.IdEstablecimiento == idEst);

                    if (entity == null)
                    {
                        model.Id = 0;
                        model.IdEstablecimiento = idEst;
                        model.IdUsuarioRegistra = idUsuario;
                        model.FechaUsuarioRegistra = DateTime.Now;
                        model.AbonoEfectivo = model.AbonoEfectivo < 0 ? 0 : model.AbonoEfectivo;
                        model.AbonoTransferencia = model.AbonoTransferencia < 0 ? 0 : model.AbonoTransferencia;
                        _db.ClientesControlMensuales.Add(model);
                        await _db.SaveChangesAsync();
                        return true;
                    }
                }
                else
                {
                    entity = await _db.ClientesControlMensuales.FirstOrDefaultAsync(x => x.Id == model.Id);

                    // Id desfasado: buscar por cliente/año/mes/establecimiento
                    if (entity == null)
                    {
                        var idEst = model.IdEstablecimiento is > 0 ? model.IdEstablecimiento : null;
                        entity = await _db.ClientesControlMensuales
                            .FirstOrDefaultAsync(x =>
                                x.IdCliente == model.IdCliente &&
                                x.Anio == model.Anio &&
                                x.Mes == model.Mes &&
                                x.IdEstablecimiento == idEst);
                    }
                }

                if (entity == null)
                    return false;

                entity.FechaVisita = model.FechaVisita;
                entity.SinEntrega = model.SinEntrega;
                entity.CajasAFavor = model.CajasAFavor;
                entity.Observaciones = model.Observaciones;
                entity.AbonoEfectivo = model.AbonoEfectivo < 0 ? 0 : model.AbonoEfectivo;
                entity.AbonoTransferencia = model.AbonoTransferencia < 0 ? 0 : model.AbonoTransferencia;
                entity.FechaTransferencia = model.FechaTransferencia;
                entity.IdUsuarioModifica = idUsuario;
                entity.FechaUsuarioModifica = DateTime.Now;

                await _db.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<decimal> CalcularStockUnidadesCliente(int idCliente, IReadOnlyList<int>? idsEstablecimiento = null)
        {
            var query = _db.ClientesEntregasProductos
                .AsNoTracking()
                .Include(p => p.IdEntregaNavigation)
                    .ThenInclude(e => e.IdContratoNavigation)
                .Where(p =>
                    p.IdEntregaNavigation.IdCliente == idCliente &&
                    (p.TipoMovimiento == TIPO_ENTREGA || p.TipoMovimiento == TIPO_RETIRO));

            if (idsEstablecimiento is { Count: > 0 })
            {
                var ids = idsEstablecimiento.Where(x => x > 0).Distinct().ToList();
                query = query.Where(p =>
                    ids.Contains(p.IdEntregaNavigation.IdEstablecimiento)
                    || (p.IdEntregaNavigation.IdEstablecimiento <= 0
                        && p.IdEntregaNavigation.IdContratoNavigation != null
                        && ids.Contains(p.IdEntregaNavigation.IdContratoNavigation.IdEstablecimiento)));
            }

            var lineas = await query.ToListAsync();

            var entregadas = lineas.Where(l => l.TipoMovimiento == TIPO_ENTREGA).Sum(l => l.Cantidad);
            var retiradas = lineas.Where(l => l.TipoMovimiento == TIPO_RETIRO).Sum(l => l.Cantidad);
            return entregadas - retiradas;
        }

        private async Task<List<ClientesRecorridoDto>> ListarRecorridosCliente(int idCliente)
        {
            var items = await _db.ClientesRecorridos
                .AsNoTracking()
                .Include(r => r.IdCamionNavigation)
                .Include(r => r.IdSemanaNavigation)
                .Include(r => r.IdDiaNavigation)
                .Include(r => r.IdEstablecimientoNavigation)
                .Include(r => r.IdClienteNavigation)
                .Where(r => r.IdCliente == idCliente)
                .OrderBy(r => r.IdCamion)
                .ThenBy(r => r.IdSemana)
                .ThenBy(r => r.IdDia)
                .ThenBy(r => r.Posicion)
                .ToListAsync();

            var matriz = await _db.RecorridosMatriz
                .AsNoTracking()
                .ToListAsync();

            return items.Select(r =>
            {
                var zona = matriz.FirstOrDefault(m =>
                    m.IdCamion == r.IdCamion &&
                    m.IdSemana == r.IdSemana &&
                    m.IdDia == r.IdDia)?.Zona ?? "";

                var camion = r.IdCamionNavigation?.Nombre ?? "";
                var semana = r.IdSemanaNavigation?.Nombre ?? "";
                var dia = r.IdDiaNavigation?.Nombre ?? "";
                var recorridoTexto = $"{camion}, {semana} {dia}, posición {r.Posicion}";
                if (!string.IsNullOrWhiteSpace(zona))
                    recorridoTexto += $" — {zona}";

                return new ClientesRecorridoDto
                {
                    Id = r.Id,
                    IdCliente = r.IdCliente,
                    Cliente = r.IdClienteNavigation?.Nombre ?? "",
                    IdEstablecimiento = r.IdEstablecimiento,
                    Establecimiento = r.IdEstablecimientoNavigation?.Nombre,
                    IdCamion = r.IdCamion,
                    Camion = camion,
                    IdSemana = r.IdSemana,
                    Semana = semana,
                    IdDia = r.IdDia,
                    Dia = dia,
                    Zona = zona,
                    Posicion = r.Posicion,
                    Activo = r.Activo,
                    Observacion = r.Observacion,
                    RecorridoTexto = recorridoTexto
                };
            }).ToList();
        }
    }
}
