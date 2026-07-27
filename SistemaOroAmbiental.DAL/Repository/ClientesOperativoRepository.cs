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
            decimal totalDebe = 0;
            decimal totalHaber = 0;

            foreach (var anio in aniosNorm)
            {
                foreach (var mes in mesesNorm)
                {
                    var fila = ConstruirFilaControlMensual(
                        anio,
                        mes,
                        entregas,
                        overrides);

                    totalDebe += fila.Debe;
                    totalHaber += fila.Haber;
                    filas.Add(fila);
                }
            }

            return new ClienteControlFiltradoDto
            {
                IdCliente = idCliente,
                Cliente = cliente.Nombre,
                NumeroCliente = cliente.NumeroCliente,
                StockActual = stockTotal,
                TotalDebe = totalDebe,
                TotalHaber = totalHaber,
                TotalSaldo = totalDebe - totalHaber,
                DatosParciales = datosParciales,
                Filas = filas,
                Recorridos = recorridos
            };
        }

        private ClienteControlMensualDto ConstruirFilaControlMensual(
            int anio,
            int mes,
            List<ClientesEntrega> entregas,
            Dictionary<(int Anio, int Mes), ClientesControlMensual> overrides)
        {
            var entregasMes = entregas
                .Where(e => e.Fecha.Year == anio && e.Fecha.Month == mes)
                .ToList();

            var lineas = entregasMes.SelectMany(e => e.ClientesEntregasProductos).ToList();

            var entregadas = lineas
                .Where(l => l.TipoMovimiento == TIPO_ENTREGA)
                .Sum(l => l.Cantidad);
            var retiradas = lineas
                .Where(l => l.TipoMovimiento == TIPO_RETIRO)
                .Sum(l => l.Cantidad);
            var subtotalEntregas = lineas
                .Where(l => l.TipoMovimiento == TIPO_ENTREGA)
                .Sum(l => l.SubtotalFinal);
            var subtotalRetiros = lineas
                .Where(l => l.TipoMovimiento == TIPO_RETIRO)
                .Sum(l => l.SubtotalFinal);

            overrides.TryGetValue((anio, mes), out var ov);

            var abonoEfectivo = ov?.AbonoEfectivo ?? 0;
            var abonoTransferencia = ov?.AbonoTransferencia ?? 0;
            var debe = subtotalEntregas;
            var haber = subtotalRetiros + abonoEfectivo + abonoTransferencia;
            var saldo = debe - haber;

            DateTime? fechaVisita = ov?.FechaVisita;
            if (!fechaVisita.HasValue && entregasMes.Count > 0)
                fechaVisita = entregasMes.Max(e => e.Fecha).Date;

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
                Saldo = saldo,
                CajasAFavor = ov?.CajasAFavor ?? 0,
                SinEntrega = ov?.SinEntrega ?? false,
                Observaciones = ov?.Observaciones,
                TieneOverride = ov != null
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
                ClientesControlMensual entity;

                if (esNuevo)
                {
                    entity = await _db.ClientesControlMensuales
                        .FirstOrDefaultAsync(x =>
                            x.IdCliente == model.IdCliente &&
                            x.Anio == model.Anio &&
                            x.Mes == model.Mes);

                    if (entity == null)
                    {
                        model.IdUsuarioRegistra = idUsuario;
                        model.FechaUsuarioRegistra = DateTime.Now;
                        _db.ClientesControlMensuales.Add(model);
                        await _db.SaveChangesAsync();
                        return true;
                    }

                    esNuevo = false;
                }
                else
                {
                    entity = await _db.ClientesControlMensuales.FirstOrDefaultAsync(x => x.Id == model.Id);
                }

                if (entity == null)
                    return false;

                entity.FechaVisita = model.FechaVisita;
                entity.SinEntrega = model.SinEntrega;
                entity.CajasAFavor = model.CajasAFavor;
                entity.Observaciones = model.Observaciones;
                entity.AbonoEfectivo = model.AbonoEfectivo;
                entity.AbonoTransferencia = model.AbonoTransferencia;
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
                    RecorridoTexto = recorridoTexto
                };
            }).ToList();
        }
    }
}
