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
                Enumerable.Range(1, 12).ToList());

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
            IReadOnlyList<int> meses)
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

            var datosParciales = false;

            List<ClientesEntrega> entregas = new();
            try
            {
                entregas = await _db.ClientesEntregas
                    .AsNoTracking()
                    .Include(e => e.ClientesEntregasProductos)
                        .ThenInclude(p => p.IdProductoNavigation)
                    .Where(e =>
                        e.IdCliente == idCliente &&
                        aniosNorm.Contains(e.Fecha.Year))
                    .ToListAsync();
            }
            catch
            {
                datosParciales = true;
            }

            var overrides = new Dictionary<(int Anio, int Mes), ClientesControlMensual>();
            try
            {
                var items = await _db.ClientesControlMensuales
                    .AsNoTracking()
                    .Where(c =>
                        c.IdCliente == idCliente &&
                        aniosNorm.Contains(c.Anio) &&
                        mesesNorm.Contains(c.Mes))
                    .ToListAsync();

                overrides = items.ToDictionary(c => (c.Anio, c.Mes));
            }
            catch
            {
                datosParciales = true;
            }

            List<ClientesCuentaCorrienteMovimiento> movimientosCc = new();
            try
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
            catch
            {
                datosParciales = true;
            }

            var recorridos = new List<ClientesRecorridoDto>();
            try
            {
                recorridos = await ListarRecorridosCliente(idCliente);
            }
            catch
            {
                datosParciales = true;
            }

            decimal stockTotal = 0;
            try
            {
                stockTotal = await CalcularStockUnidadesCliente(idCliente);
            }
            catch
            {
                datosParciales = true;
            }

            var filas = new List<ClienteControlMensualDto>();

            // Armamos todas las filas pedidas y después calculamos saldo corrido cronológico.
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

            // Saldo anterior al primer periodo visible (misma lógica Debe - Haber que CC).
            decimal saldoAcumulado = 0;
            if (periodos.Count > 0)
            {
                var primero = periodos[0];
                var inicio = new DateTime(primero.Anio, primero.Mes, 1);
                saldoAcumulado = movimientosCc
                    .Where(m => m.Fecha < inicio)
                    .Sum(m => m.Debe - m.Haber);
            }

            decimal totalDebe = 0;
            decimal totalHaber = 0;

            foreach (var fila in filas.OrderBy(f => f.Anio).ThenBy(f => f.Mes))
            {
                totalDebe += fila.Debe;
                totalHaber += fila.Haber;
                saldoAcumulado += fila.Debe - fila.Haber;
                fila.Saldo = saldoAcumulado;
            }

            // Devolver en el mismo orden de filtros (años desc, meses asc) que antes.
            var filasOrdenadas = aniosNorm
                .SelectMany(a => mesesNorm.Select(m => filas.First(f => f.Anio == a && f.Mes == m)))
                .ToList();

            return new ClienteControlFiltradoDto
            {
                IdCliente = idCliente,
                Cliente = cliente.Nombre,
                NumeroCliente = cliente.NumeroCliente,
                StockActual = stockTotal,
                TotalDebe = totalDebe,
                TotalHaber = totalHaber,
                // Preferimos el saldo corrido de la planilla (última fila = este total).
                TotalSaldo = saldoAcumulado,
                DatosParciales = datosParciales,
                Filas = filasOrdenadas,
                Recorridos = recorridos
            };
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

            // Fórmula planilla (alineada a Excel):
            // Debe  = lo entregado (cargo al cliente)
            // Haber = retiros + abonos cargados en el mes
            // Si hay movimientos de CC en el mes, usamos esos importes (misma fuente que la solapa),
            // y sumamos abonos de planilla que todavía no estén cobrados en CC.
            var inicioMes = new DateTime(anio, mes, 1);
            var finMes = inicioMes.AddMonths(1);
            var movsMes = movimientosCc
                .Where(m => m.Fecha >= inicioMes && m.Fecha < finMes)
                .ToList();

            decimal debe;
            decimal haber;
            if (movsMes.Count > 0)
            {
                debe = movsMes.Sum(m => m.Debe);
                haber = movsMes.Sum(m => m.Haber);

                // Datos viejos: entrega en CC con Debe 0 pero líneas con precio → usar operativo.
                if (debe == 0 && subtotalEntregas > 0)
                    debe = subtotalEntregas;
                if (haber == 0 && subtotalRetiros > 0)
                    haber = subtotalRetiros;

                var abonosPlanilla = abonoEfectivo + abonoTransferencia;
                var cobrosCc = movsMes
                    .Where(m => m.TipoMovimiento == ClientesCuentaCorrienteRepository.TIPO_COBRO_CLIENTE)
                    .Sum(m => m.Haber);
                if (abonosPlanilla > cobrosCc)
                    haber += abonosPlanilla - cobrosCc;
            }
            else
            {
                debe = subtotalEntregas;
                haber = subtotalRetiros + abonoEfectivo + abonoTransferencia;
            }

            DateTime? fechaVisita = ov?.FechaVisita;
            if (!fechaVisita.HasValue && entregasMes.Count > 0)
                fechaVisita = entregasMes.Max(e => e.Fecha).Date;

            var productos = lineas
                .Where(l => l.TipoMovimiento == TIPO_ENTREGA || l.TipoMovimiento == TIPO_RETIRO)
                .GroupBy(l => new
                {
                    l.IdProducto,
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
                    return new ClienteControlProductoMesDto
                    {
                        IdProducto = g.Key.IdProducto,
                        Producto = g.Key.Nombre,
                        Entregadas = cantEnt,
                        Retiradas = cantRet,
                        PrecioUnitarioEntrega = cantEnt > 0 ? subEnt / cantEnt : 0,
                        PrecioUnitarioRetiro = cantRet > 0 ? subRet / cantRet : 0,
                        SubtotalEntregas = subEnt,
                        SubtotalRetiros = subRet
                    };
                })
                .OrderBy(p => p.Producto)
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
                AbonoEfectivo = abonoEfectivo,
                AbonoTransferencia = abonoTransferencia,
                FechaTransferencia = ov?.FechaTransferencia,
                Debe = debe,
                Haber = haber,
                Saldo = debe - haber, // se reemplaza luego por saldo acumulado
                CajasAFavor = ov?.CajasAFavor ?? 0,
                SinEntrega = ov?.SinEntrega ?? false,
                Observaciones = ov?.Observaciones,
                TieneOverride = ov != null,
                Productos = productos
            };
        }

        public async Task<List<ClienteStockDto>> ObtenerStockCliente(int idCliente)
        {
            var lineas = await _db.ClientesEntregasProductos
                .AsNoTracking()
                .Include(p => p.IdProductoNavigation)
                .Include(p => p.IdEntregaNavigation)
                .Where(p =>
                    p.IdEntregaNavigation.IdCliente == idCliente &&
                    (p.TipoMovimiento == TIPO_ENTREGA || p.TipoMovimiento == TIPO_RETIRO))
                .ToListAsync();

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

        public async Task<bool> GuardarControlMensual(ClientesControlMensual model, bool esNuevo, int idUsuario)
        {
            try
            {
                ClientesControlMensual? entity = null;

                if (esNuevo || model.Id <= 0)
                {
                    entity = await _db.ClientesControlMensuales
                        .FirstOrDefaultAsync(x =>
                            x.IdCliente == model.IdCliente &&
                            x.Anio == model.Anio &&
                            x.Mes == model.Mes);

                    if (entity == null)
                    {
                        model.Id = 0;
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

                    // Id desfasado: buscar por cliente/año/mes
                    if (entity == null)
                    {
                        entity = await _db.ClientesControlMensuales
                            .FirstOrDefaultAsync(x =>
                                x.IdCliente == model.IdCliente &&
                                x.Anio == model.Anio &&
                                x.Mes == model.Mes);
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

        private async Task<decimal> CalcularStockUnidadesCliente(int idCliente)
        {
            var lineas = await _db.ClientesEntregasProductos
                .AsNoTracking()
                .Include(p => p.IdEntregaNavigation)
                .Where(p =>
                    p.IdEntregaNavigation.IdCliente == idCliente &&
                    (p.TipoMovimiento == TIPO_ENTREGA || p.TipoMovimiento == TIPO_RETIRO))
                .ToListAsync();

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
