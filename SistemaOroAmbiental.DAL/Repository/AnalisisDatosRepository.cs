using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;
using SistemaOroAmbiental.Models.Analisis;

namespace SistemaOroAmbiental.DAL.Repository;

public class AnalisisDatosRepository : IAnalisisDatosRepository
{
    private const int TIPO_ENTREGA = ClientesEntregasRepository.TIPO_LINEA_ENTREGA;
    private const int TIPO_RETIRO = ClientesEntregasRepository.TIPO_LINEA_RETIRO;

    private static readonly string[] MesesNombres =
    {
        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    };

    private readonly SistemaOroAmbientalContext _db;

    public AnalisisDatosRepository(SistemaOroAmbientalContext context)
    {
        _db = context;
    }

    private static (DateTime desde, DateTime hasta) ResolverPeriodo(AnalisisFiltro filtro)
    {
        var hoy = DateTime.Today;
        var desde = filtro.FechaDesde?.Date ?? new DateTime(hoy.Year, hoy.Month, 1).AddMonths(-2);
        var hasta = (filtro.FechaHasta?.Date ?? hoy).Date.AddDays(1).AddTicks(-1);
        return (desde, hasta);
    }

    private static bool FiltraSucursal(AnalisisFiltro filtro) => filtro.IdSucursal > 0;
    private static bool FiltraCliente(AnalisisFiltro filtro) => filtro.IdCliente > 0;
    private static bool FiltraEstablecimientos(AnalisisFiltro filtro)
        => FiltraCliente(filtro) && filtro.IdsEstablecimientos is { Count: > 0 };

    private static IQueryable<ClientesEntrega> AplicarFiltroEntregas(
        IQueryable<ClientesEntrega> q, AnalisisFiltro filtro)
    {
        if (FiltraSucursal(filtro))
            q = q.Where(e => e.IdClienteNavigation.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            q = q.Where(e => e.IdCliente == filtro.IdCliente);
        if (FiltraEstablecimientos(filtro))
            q = q.Where(e => filtro.IdsEstablecimientos.Contains(e.IdEstablecimiento));
        return q;
    }

    private static IQueryable<ClientesCobro> AplicarFiltroCobros(
        IQueryable<ClientesCobro> q, AnalisisFiltro filtro)
    {
        if (FiltraSucursal(filtro))
            q = q.Where(c => c.IdClienteNavigation.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            q = q.Where(c => c.IdCliente == filtro.IdCliente);
        // Cobros no tienen establecimiento: si hay filtro de est., limitar a cobros de entregas de esos est.
        if (FiltraEstablecimientos(filtro))
        {
            q = q.Where(c =>
                c.IdEntrega == null ||
                (c.IdEntregaNavigation != null &&
                 filtro.IdsEstablecimientos.Contains(c.IdEntregaNavigation.IdEstablecimiento)));
        }
        return q;
    }

    private static List<AnalisisEstablecimientoItem> ArmarPorEstablecimiento(
        List<ClientesEntrega> entregas)
    {
        const int tipoEntrega = ClientesEntregasRepository.TIPO_LINEA_ENTREGA;
        const int tipoRetiro = ClientesEntregasRepository.TIPO_LINEA_RETIRO;

        return entregas
            .GroupBy(e => new
            {
                e.IdEstablecimiento,
                Nombre = e.IdEstablecimientoNavigation?.Nombre ?? $"Establecimiento #{e.IdEstablecimiento}"
            })
            .Select(g =>
            {
                var lineas = g.SelectMany(e => e.ClientesEntregasProductos).ToList();
                var le = lineas.Where(l => l.TipoMovimiento == tipoEntrega).ToList();
                var lr = lineas.Where(l => l.TipoMovimiento == tipoRetiro).ToList();
                var rec = g.SelectMany(e => e.ClientesEntregasProductosRecuperados).Sum(r => r.Cantidad);
                var imp = le.Sum(l => l.SubtotalFinal);
                var gan = le.Sum(l => l.Ganancia);
                return new AnalisisEstablecimientoItem
                {
                    IdEstablecimiento = g.Key.IdEstablecimiento,
                    Nombre = g.Key.Nombre,
                    Entregas = g.Count(),
                    UnidadesEntregadas = le.Sum(l => l.Cantidad),
                    UnidadesRetiradas = lr.Sum(l => l.Cantidad),
                    UnidadesRecuperadas = rec,
                    ImporteEntregado = imp,
                    Ganancia = gan,
                    Cobrado = g.Sum(e => e.ImporteAbonado),
                    Subtitulo = $"{g.Count()} entregas · ent {le.Sum(l => l.Cantidad):N0} · ret {lr.Sum(l => l.Cantidad):N0}"
                };
            })
            .OrderByDescending(x => x.ImporteEntregado)
            .ToList();
    }

    private static bool EstadoContiene(string? nombre, string patron)
        => !string.IsNullOrWhiteSpace(nombre) &&
           nombre.Contains(patron, StringComparison.OrdinalIgnoreCase);

    private static bool EsBaja(Cliente c) => EstadoContiene(c.IdEstadoNavigation?.Nombre, "Baja");
    private static bool EsSuspendido(Cliente c) => EstadoContiene(c.IdEstadoNavigation?.Nombre, "SUSPEND");

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

    private static string FormaCobro(string? tipoCuenta)
    {
        if (string.IsNullOrWhiteSpace(tipoCuenta)) return "Otro";
        if (tipoCuenta.Contains("Efectivo", StringComparison.OrdinalIgnoreCase)) return "Efectivo";
        if (tipoCuenta.Contains("Banco", StringComparison.OrdinalIgnoreCase) ||
            tipoCuenta.Contains("Transfer", StringComparison.OrdinalIgnoreCase))
            return "Banco / Transferencia";
        return tipoCuenta.Trim();
    }

    public async Task<AnalisisClientesResumen> ObtenerReporteClientes(AnalisisFiltro filtro)
    {
        var (desde, hasta) = ResolverPeriodo(filtro);
        var hoy = DateTime.Today;
        var limiteLicencia = hoy.AddDays(31);
        var inicioMes = new DateTime(hoy.Year, hoy.Month, 1);

        var clientesQ = _db.Clientes
            .AsNoTracking()
            .Include(c => c.IdEstadoNavigation)
            .Include(c => c.IdTipoGeneradorNavigation)
            .Include(c => c.ClientesCuentaCorrientes)
            .AsQueryable();

        if (FiltraSucursal(filtro))
            clientesQ = clientesQ.Where(c => c.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            clientesQ = clientesQ.Where(c => c.Id == filtro.IdCliente);

        var clientes = await clientesQ.ToListAsync();

        var dto = new AnalisisClientesResumen
        {
            Total = clientes.Count,
            Activos = clientes.Count(c => EsActivoOperativo(c, hoy)),
            Suspendidos = clientes.Count(EsSuspendido),
            Baja = clientes.Count(EsBaja),
            Licencia = clientes.Count(c => EstaEnLicencia(c, hoy)),
            LicenciasPorVencer = clientes.Count(c =>
                EstaEnLicencia(c, hoy) &&
                c.FechaLicenciaHasta.HasValue &&
                c.FechaLicenciaHasta.Value.Date >= hoy &&
                c.FechaLicenciaHasta.Value.Date <= limiteLicencia),
            BajasMesActual = clientes.Count(c =>
                EsBaja(c) &&
                c.FechaUsuarioModifica.HasValue &&
                c.FechaUsuarioModifica.Value >= inicioMes),
            SaldoCcTotal = clientes.SelectMany(c => c.ClientesCuentaCorrientes).Sum(cc => cc.Saldo),
            ClientesConDeuda = clientes.Count(c => c.ClientesCuentaCorrientes.Sum(cc => cc.Saldo) > 0),
            ClientesConSaldoAFavor = clientes.Count(c => c.ClientesCuentaCorrientes.Sum(cc => cc.Saldo) < 0),
            ClienteFiltroId = FiltraCliente(filtro) ? filtro.IdCliente : null,
            ClienteFiltroNombre = FiltraCliente(filtro) ? clientes.FirstOrDefault()?.Nombre : null
        };

        dto.PorEstado = clientes
            .GroupBy(c => c.IdEstadoNavigation?.Nombre ?? (c.Activo ? "Sin estado" : "Inactivo"))
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Cantidad = g.Count()
            })
            .OrderByDescending(x => x.Cantidad)
            .ToList();

        dto.PorTipoGenerador = clientes
            .GroupBy(c => c.IdTipoGeneradorNavigation?.Nombre ?? "Sin tipo")
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Cantidad = g.Count()
            })
            .OrderByDescending(x => x.Cantidad)
            .ToList();

        dto.TopDeudores = clientes
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                c.NumeroCliente,
                Saldo = c.ClientesCuentaCorrientes.Sum(cc => cc.Saldo)
            })
            .Where(x => x.Saldo > 0)
            .OrderByDescending(x => x.Saldo)
            .Take(15)
            .Select(x => new AnalisisRankingClienteItem
            {
                Id = x.Id,
                Nombre = x.Nombre,
                NumeroCliente = x.NumeroCliente,
                Saldo = x.Saldo,
                Subtitulo = x.NumeroCliente.HasValue ? $"Nº {x.NumeroCliente}" : null
            })
            .ToList();

        dto.TopAFavor = clientes
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                c.NumeroCliente,
                Saldo = c.ClientesCuentaCorrientes.Sum(cc => cc.Saldo)
            })
            .Where(x => x.Saldo < 0)
            .OrderBy(x => x.Saldo)
            .Take(10)
            .Select(x => new AnalisisRankingClienteItem
            {
                Id = x.Id,
                Nombre = x.Nombre,
                NumeroCliente = x.NumeroCliente,
                Saldo = x.Saldo,
                Subtitulo = "A favor"
            })
            .ToList();

        dto.AlertasLicencia = clientes
            .Where(c =>
                EstaEnLicencia(c, hoy) &&
                c.FechaLicenciaHasta.HasValue &&
                c.FechaLicenciaHasta.Value.Date >= hoy &&
                c.FechaLicenciaHasta.Value.Date <= limiteLicencia)
            .OrderBy(c => c.FechaLicenciaHasta)
            .Take(20)
            .Select(c => new AnalisisAlertaItem
            {
                Id = c.Id,
                Titulo = c.Nombre,
                Detalle = $"Licencia vence {(c.FechaLicenciaHasta!.Value.Date - hoy).Days} día(s) — {c.FechaLicenciaHasta:dd/MM/yyyy}",
                Severidad = "warn",
                Url = $"/Clientes/Gestion/{c.Id}"
            })
            .ToList();

        var desdeBajas = inicioMes.AddMonths(-11);
        dto.BajasPorMes = clientes
            .Where(c =>
                EsBaja(c) &&
                c.FechaUsuarioModifica.HasValue &&
                c.FechaUsuarioModifica.Value >= desdeBajas)
            .GroupBy(c => new { c.FechaUsuarioModifica!.Value.Year, c.FechaUsuarioModifica.Value.Month })
            .Select(g => new AnalisisItemCantidad
            {
                Clave = $"{g.Key.Year}-{g.Key.Month:D2}",
                Etiqueta = $"{MesesNombres[g.Key.Month]} {g.Key.Year}",
                Cantidad = g.Count()
            })
            .OrderBy(x => x.Clave)
            .ToList();

        var establecimientosQ = _db.ClientesEstablecimientos
            .AsNoTracking()
            .Include(e => e.IdPartidoNavigation)
            .Include(e => e.IdLocalidadNavigation)
            .Include(e => e.IdClienteNavigation)
            .AsQueryable();

        if (FiltraSucursal(filtro))
            establecimientosQ = establecimientosQ.Where(e => e.IdClienteNavigation.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            establecimientosQ = establecimientosQ.Where(e => e.IdCliente == filtro.IdCliente);
        if (FiltraEstablecimientos(filtro))
            establecimientosQ = establecimientosQ.Where(e => filtro.IdsEstablecimientos.Contains(e.Id));

        var establecimientos = await establecimientosQ.ToListAsync();
        dto.EstablecimientosTotal = establecimientos.Count;

        dto.PorPartido = establecimientos
            .GroupBy(e => e.IdPartidoNavigation?.Nombre ?? "Sin partido")
            .Select(g => new AnalisisGeoItem
            {
                Etiqueta = g.Key,
                CantidadEstablecimientos = g.Count(),
                CantidadClientes = g.Select(x => x.IdCliente).Distinct().Count()
            })
            .OrderByDescending(x => x.CantidadEstablecimientos)
            .Take(15)
            .ToList();

        dto.PorLocalidad = establecimientos
            .GroupBy(e => e.IdLocalidadNavigation?.Nombre ?? e.Localidad ?? "Sin localidad")
            .Select(g => new AnalisisGeoItem
            {
                Etiqueta = g.Key,
                CantidadEstablecimientos = g.Count(),
                CantidadClientes = g.Select(x => x.IdCliente).Distinct().Count()
            })
            .OrderByDescending(x => x.CantidadEstablecimientos)
            .Take(15)
            .ToList();

        // Clientes activos sin entrega en el período filtrado
        var entregasPeriodoQ = _db.ClientesEntregas
            .AsNoTracking()
            .Include(e => e.IdClienteNavigation)
            .Where(e => e.Fecha >= desde && e.Fecha <= hasta);
        entregasPeriodoQ = AplicarFiltroEntregas(entregasPeriodoQ, filtro);

        var idsConEntrega = await entregasPeriodoQ
            .Select(e => e.IdCliente)
            .Distinct()
            .ToListAsync();

        var setEntrega = idsConEntrega.ToHashSet();
        var sinEntrega = clientes
            .Where(c => EsActivoOperativo(c, hoy) && !setEntrega.Contains(c.Id))
            .OrderBy(c => c.Nombre)
            .ToList();

        dto.SinEntregaReciente = sinEntrega.Count;
        dto.SinEntregaRecienteLista = sinEntrega
            .Take(20)
            .Select(c => new AnalisisRankingClienteItem
            {
                Id = c.Id,
                Nombre = c.Nombre,
                NumeroCliente = c.NumeroCliente,
                Subtitulo = c.NumeroCliente.HasValue ? $"Nº {c.NumeroCliente}" : null
            })
            .ToList();

        var entregasCliQ = _db.ClientesEntregas
            .AsNoTracking()
            .Include(e => e.IdClienteNavigation)
            .Include(e => e.IdEstablecimientoNavigation)
            .Include(e => e.ClientesEntregasProductos)
            .Include(e => e.ClientesEntregasProductosRecuperados)
            .Where(e => e.Fecha >= desde && e.Fecha <= hasta);
        entregasCliQ = AplicarFiltroEntregas(entregasCliQ, filtro);
        var entregasCli = await entregasCliQ.ToListAsync();

        dto.TopPorEntregasPeriodo = entregasCli
            .GroupBy(e => new { e.IdCliente, e.IdClienteNavigation.Nombre, e.IdClienteNavigation.NumeroCliente })
            .Select(g => new AnalisisRankingClienteItem
            {
                Id = g.Key.IdCliente,
                Nombre = g.Key.Nombre,
                NumeroCliente = g.Key.NumeroCliente,
                Cantidad = g.Count(),
                Importe = g.Sum(e => e.ImporteTotal),
                Subtitulo = $"{g.Count()} entregas · ${g.Sum(e => e.ImporteTotal):N0}"
            })
            .OrderByDescending(x => x.Cantidad)
            .Take(12)
            .ToList();

        dto.PorEstablecimiento = ArmarPorEstablecimiento(entregasCli);

        return dto;
    }

    public async Task<AnalisisOperacionesResumen> ObtenerReporteOperaciones(AnalisisFiltro filtro)
    {
        var (desde, hasta) = ResolverPeriodo(filtro);

        var entregasQ = _db.ClientesEntregas
            .AsNoTracking()
            .Include(e => e.IdClienteNavigation)
            .Include(e => e.IdEstablecimientoNavigation)
            .Include(e => e.IdCamionNavigation)
            .Include(e => e.ClientesEntregasProductos)
                .ThenInclude(p => p.IdProductoNavigation)
            .Include(e => e.ClientesEntregasProductosRecuperados)
                .ThenInclude(r => r.IdProductoNavigation)
            .Where(e => e.Fecha >= desde && e.Fecha <= hasta)
            .AsQueryable();

        entregasQ = AplicarFiltroEntregas(entregasQ, filtro);

        var entregas = await entregasQ.ToListAsync();

        var lineas = entregas.SelectMany(e => e.ClientesEntregasProductos.Select(l => new { Entrega = e, Linea = l })).ToList();
        var lineasEntrega = lineas.Where(x => x.Linea.TipoMovimiento == TIPO_ENTREGA).ToList();
        var lineasRetiro = lineas.Where(x => x.Linea.TipoMovimiento == TIPO_RETIRO).ToList();
        var recuperados = entregas.SelectMany(e => e.ClientesEntregasProductosRecuperados).ToList();

        var unidadesEnt = lineasEntrega.Sum(x => x.Linea.Cantidad);
        var unidadesRet = lineasRetiro.Sum(x => x.Linea.Cantidad);
        var unidadesRec = recuperados.Sum(r => r.Cantidad);
        var entregadoImp = lineasEntrega.Sum(x => x.Linea.SubtotalFinal);
        var ganancia = lineasEntrega.Sum(x => x.Linea.Ganancia);
        var costo = lineasEntrega.Sum(x => x.Linea.SubtotalCosto);

        var cobrosQ = _db.ClientesCobros
            .AsNoTracking()
            .Include(c => c.IdClienteNavigation)
            .Include(c => c.IdEntregaNavigation)
            .Where(c => c.Fecha >= desde && c.Fecha <= hasta)
            .AsQueryable();
        cobrosQ = AplicarFiltroCobros(cobrosQ, filtro);
        var cobrado = await cobrosQ.SumAsync(c => (decimal?)c.Importe) ?? 0m;

        var dto = new AnalisisOperacionesResumen
        {
            EntregasCantidad = entregas.Count,
            RetirosCantidad = lineasRetiro.Select(x => x.Entrega.Id).Distinct().Count(),
            LineasEntrega = lineasEntrega.Count,
            LineasRetiro = lineasRetiro.Count,
            EntregadoImporte = entregadoImp,
            RetiradoImporte = lineasRetiro.Sum(x => x.Linea.SubtotalFinal),
            UnidadesEntregadas = unidadesEnt,
            UnidadesRetiradas = unidadesRet,
            GananciaPeriodo = ganancia,
            CostoPeriodo = costo,
            RecuperadoCantidad = unidadesRec,
            RatioRecuperadoPct = unidadesEnt > 0 ? Math.Round(unidadesRec / unidadesEnt * 100m, 1) : 0m,
            CobradoPeriodo = cobrado,
            TicketPromedio = entregas.Count > 0 ? Math.Round(entregas.Sum(e => e.ImporteTotal) / entregas.Count, 2) : 0m,
            SaldoEntregasPeriodo = entregas.Sum(e => e.Saldo),
            MixMovimientos = new List<AnalisisItemCantidad>
            {
                new() { Clave = "entrega", Etiqueta = "Entregadas", Cantidad = unidadesEnt, Importe = entregadoImp },
                new() { Clave = "retiro", Etiqueta = "Retiros", Cantidad = unidadesRet, Importe = lineasRetiro.Sum(x => x.Linea.SubtotalFinal) },
                new() { Clave = "recuperado", Etiqueta = "Recuperadas", Cantidad = unidadesRec, Importe = recuperados.Sum(r => r.SubtotalFinal) }
            }
        };

        // Serie mensual
        var meses = new List<(int Y, int M)>();
        var cursor = new DateTime(desde.Year, desde.Month, 1);
        var finMes = new DateTime(hasta.Year, hasta.Month, 1);
        while (cursor <= finMes)
        {
            meses.Add((cursor.Year, cursor.Month));
            cursor = cursor.AddMonths(1);
        }

        dto.SerieMensual = meses.Select(m =>
        {
            var ents = entregas.Where(e => e.Fecha.Year == m.Y && e.Fecha.Month == m.M).ToList();
            var ls = ents.SelectMany(e => e.ClientesEntregasProductos).ToList();
            var le = ls.Where(l => l.TipoMovimiento == TIPO_ENTREGA).ToList();
            var lr = ls.Where(l => l.TipoMovimiento == TIPO_RETIRO).ToList();
            var rec = ents.SelectMany(e => e.ClientesEntregasProductosRecuperados).Sum(r => r.Cantidad);
            return new AnalisisSerieMesItem
            {
                Anio = m.Y,
                Mes = m.M,
                MesNombre = $"{MesesNombres[m.M]} {m.Y}",
                Entregado = le.Sum(l => l.SubtotalFinal),
                Retirado = lr.Sum(l => l.SubtotalFinal),
                Ganancia = le.Sum(l => l.Ganancia),
                Recuperado = rec,
                UnidadesEntregadas = le.Sum(l => l.Cantidad),
                UnidadesRetiradas = lr.Sum(l => l.Cantidad),
                Entregas = ents.Count
            };
        }).ToList();

        // Completar cobrado/gastos en serie (para el chart de ops solo usamos entregado/retirado/ganancia)
        var cobrosLista = await cobrosQ.ToListAsync();
        foreach (var s in dto.SerieMensual)
            s.Cobrado = cobrosLista.Where(c => c.Fecha.Year == s.Anio && c.Fecha.Month == s.Mes).Sum(c => c.Importe);

        dto.TopProductosEntregados = lineasEntrega
            .GroupBy(x => new { x.Linea.IdProducto, Nombre = x.Linea.IdProductoNavigation?.Nombre ?? $"#{x.Linea.IdProducto}" })
            .Select(g => new AnalisisRankingProductoItem
            {
                IdProducto = g.Key.IdProducto,
                Producto = g.Key.Nombre,
                Cantidad = g.Sum(x => x.Linea.Cantidad),
                Importe = g.Sum(x => x.Linea.SubtotalFinal),
                Ganancia = g.Sum(x => x.Linea.Ganancia),
                Subtitulo = $"${g.Sum(x => x.Linea.SubtotalFinal):N0} facturado"
            })
            .OrderByDescending(x => x.Cantidad)
            .Take(12)
            .ToList();

        dto.TopProductosRetirados = lineasRetiro
            .GroupBy(x => new { x.Linea.IdProducto, Nombre = x.Linea.IdProductoNavigation?.Nombre ?? $"#{x.Linea.IdProducto}" })
            .Select(g => new AnalisisRankingProductoItem
            {
                IdProducto = g.Key.IdProducto,
                Producto = g.Key.Nombre,
                Cantidad = g.Sum(x => x.Linea.Cantidad),
                Importe = g.Sum(x => x.Linea.SubtotalFinal),
                Subtitulo = null
            })
            .OrderByDescending(x => x.Cantidad)
            .Take(12)
            .ToList();

        dto.TopProductosRecuperados = recuperados
            .GroupBy(r => new { r.IdProducto, Nombre = r.IdProductoNavigation?.Nombre ?? $"#{r.IdProducto}" })
            .Select(g => new AnalisisRankingProductoItem
            {
                IdProducto = g.Key.IdProducto,
                Producto = g.Key.Nombre,
                Cantidad = g.Sum(r => r.Cantidad),
                Importe = g.Sum(r => r.SubtotalFinal),
                Subtitulo = null
            })
            .OrderByDescending(x => x.Cantidad)
            .Take(12)
            .ToList();

        dto.TopProductosPorMargen = lineasEntrega
            .GroupBy(x => new { x.Linea.IdProducto, Nombre = x.Linea.IdProductoNavigation?.Nombre ?? $"#{x.Linea.IdProducto}" })
            .Select(g => new AnalisisRankingProductoItem
            {
                IdProducto = g.Key.IdProducto,
                Producto = g.Key.Nombre,
                Cantidad = g.Sum(x => x.Linea.Cantidad),
                Importe = g.Sum(x => x.Linea.SubtotalFinal),
                Ganancia = g.Sum(x => x.Linea.Ganancia),
                Subtitulo = $"{g.Sum(x => x.Linea.Cantidad):N0} u. entregadas"
            })
            .OrderByDescending(x => x.Ganancia)
            .Take(12)
            .ToList();

        dto.TopClientesPorImporte = entregas
            .GroupBy(e => new { e.IdCliente, e.IdClienteNavigation.Nombre, e.IdClienteNavigation.NumeroCliente })
            .Select(g => new AnalisisRankingClienteItem
            {
                Id = g.Key.IdCliente,
                Nombre = g.Key.Nombre,
                NumeroCliente = g.Key.NumeroCliente,
                Importe = g.Sum(e => e.ImporteTotal),
                Cantidad = g.Count(),
                Subtitulo = $"{g.Count()} entregas"
            })
            .OrderByDescending(x => x.Importe)
            .Take(15)
            .ToList();

        dto.TopClientesPorRetiros = lineasRetiro
            .GroupBy(x => new
            {
                x.Entrega.IdCliente,
                x.Entrega.IdClienteNavigation.Nombre,
                x.Entrega.IdClienteNavigation.NumeroCliente
            })
            .Select(g => new AnalisisRankingClienteItem
            {
                Id = g.Key.IdCliente,
                Nombre = g.Key.Nombre,
                NumeroCliente = g.Key.NumeroCliente,
                Cantidad = g.Sum(x => x.Linea.Cantidad),
                Importe = g.Sum(x => x.Linea.SubtotalFinal),
                Subtitulo = $"{g.Sum(x => x.Linea.Cantidad):N0} u. retiradas"
            })
            .OrderByDescending(x => x.Cantidad)
            .Take(12)
            .ToList();

        dto.PorCamion = entregas
            .GroupBy(e => e.IdCamionNavigation?.Nombre ?? "Sin camión")
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Cantidad = g.Count(),
                Importe = g.Sum(e => e.ImporteTotal),
                CantidadMovimientos = g.Select(x => x.IdCliente).Distinct().Count(),
                Subtitulo = $"{g.Select(x => x.IdCliente).Distinct().Count()} clientes"
            })
            .OrderByDescending(x => x.Importe)
            .ToList();

        dto.PorEstablecimiento = ArmarPorEstablecimiento(entregas);

        return dto;
    }

    public async Task<AnalisisFinanzasResumen> ObtenerReporteFinanzas(AnalisisFiltro filtro)
    {
        var (desde, hasta) = ResolverPeriodo(filtro);

        var cobrosQ = _db.ClientesCobros
            .AsNoTracking()
            .Include(c => c.IdClienteNavigation)
            .Include(c => c.IdCuentaNavigation)
            .Include(c => c.IdEntregaNavigation)
            .Where(c => c.Fecha >= desde && c.Fecha <= hasta)
            .AsQueryable();
        cobrosQ = AplicarFiltroCobros(cobrosQ, filtro);
        var cobros = await cobrosQ.ToListAsync();

        var gastosQ = _db.Gastos
            .AsNoTracking()
            .Include(g => g.IdCategoriaNavigation)
            .Include(g => g.IdCuentaNavigation)
            .Where(g => g.Fecha >= desde && g.Fecha <= hasta)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            gastosQ = gastosQ.Where(g => g.IdCuentaNavigation.IdSucursal == filtro.IdSucursal);
        // Gastos no se filtran por cliente
        var gastos = await gastosQ.ToListAsync();

        var saldosQ = _db.CajasSaldos
            .AsNoTracking()
            .Include(s => s.IdCuentaNavigation)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            saldosQ = saldosQ.Where(s => s.IdCuentaNavigation.IdSucursal == filtro.IdSucursal);
        var saldos = await saldosQ.ToListAsync();

        var ccClientesQ = _db.ClientesCuentaCorrientes
            .AsNoTracking()
            .Include(cc => cc.IdClienteNavigation)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            ccClientesQ = ccClientesQ.Where(cc => cc.IdClienteNavigation.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            ccClientesQ = ccClientesQ.Where(cc => cc.IdCliente == filtro.IdCliente);
        var ccClientes = await ccClientesQ.ToListAsync();

        var saldoProv = FiltraCliente(filtro)
            ? 0m
            : await _db.ProveedoresCuentaCorrientes.AsNoTracking().SumAsync(p => (decimal?)p.Saldo) ?? 0m;

        var cobrado = cobros.Sum(c => c.Importe);
        var gastosTot = FiltraCliente(filtro) ? 0m : gastos.Sum(g => g.ImporteTotal);

        var facturadoQ = _db.ClientesEntregas
            .AsNoTracking()
            .Include(e => e.IdClienteNavigation)
            .Where(e => e.Fecha >= desde && e.Fecha <= hasta);
        facturadoQ = AplicarFiltroEntregas(facturadoQ, filtro);
        var facturado = await facturadoQ.SumAsync(e => (decimal?)e.ImporteTotal) ?? 0m;

        var saldoEfectivo = saldos
            .Where(s => FormaCobro(s.IdCuentaNavigation.TipoCuenta) == "Efectivo")
            .Sum(s => s.Saldo);
        var saldoBanco = saldos
            .Where(s => FormaCobro(s.IdCuentaNavigation.TipoCuenta) == "Banco / Transferencia")
            .Sum(s => s.Saldo);

        var dto = new AnalisisFinanzasResumen
        {
            CobradoPeriodo = cobrado,
            GastosPeriodo = gastosTot,
            ResultadoPeriodo = cobrado - gastosTot,
            SaldoEfectivo = saldoEfectivo,
            SaldoBanco = saldoBanco,
            SaldoTotal = saldos.Sum(s => s.Saldo),
            SaldoCcClientes = ccClientes.Sum(c => c.Saldo),
            SaldoCcProveedores = saldoProv,
            FacturadoEntregas = facturado,
            CantidadGastos = gastos.Count,
            CantidadCobros = cobros.Count,
            PromedioCobro = cobros.Count > 0 ? Math.Round(cobrado / cobros.Count, 2) : 0m
        };

        dto.CobrosPorForma = cobros
            .GroupBy(c => FormaCobro(c.IdCuentaNavigation?.TipoCuenta))
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Importe = g.Sum(x => x.Importe),
                Cantidad = g.Count(),
                CantidadMovimientos = g.Count()
            })
            .OrderByDescending(x => x.Importe)
            .ToList();

        dto.GastosPorCategoria = gastos
            .GroupBy(g => g.IdCategoriaNavigation?.Nombre ?? "Sin categoría")
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Importe = g.Sum(x => x.ImporteTotal),
                Cantidad = g.Count(),
                CantidadMovimientos = g.Count()
            })
            .OrderByDescending(x => x.Importe)
            .ToList();

        var meses = new List<(int Y, int M)>();
        var cursor = new DateTime(desde.Year, desde.Month, 1);
        var finMes = new DateTime(hasta.Year, hasta.Month, 1);
        while (cursor <= finMes)
        {
            meses.Add((cursor.Year, cursor.Month));
            cursor = cursor.AddMonths(1);
        }

        dto.SerieMensual = meses.Select(m =>
        {
            var c = cobros.Where(x => x.Fecha.Year == m.Y && x.Fecha.Month == m.M).Sum(x => x.Importe);
            var g = gastos.Where(x => x.Fecha.Year == m.Y && x.Fecha.Month == m.M).Sum(x => x.ImporteTotal);
            return new AnalisisSerieMesItem
            {
                Anio = m.Y,
                Mes = m.M,
                MesNombre = $"{MesesNombres[m.M]} {m.Y}",
                Cobrado = c,
                Gastos = g
            };
        }).ToList();

        dto.PorMes = dto.SerieMensual.Select(s => new AnalisisMesCardItem
        {
            Anio = s.Anio,
            Mes = s.Mes,
            Periodo = s.MesNombre,
            Cobrado = s.Cobrado,
            Gastos = s.Gastos,
            Resultado = s.Cobrado - s.Gastos,
            CobroMayorGasto = s.Cobrado >= s.Gastos
        }).ToList();

        dto.TopDeudores = ccClientes
            .Where(c => c.Saldo > 0)
            .OrderByDescending(c => c.Saldo)
            .Take(15)
            .Select(c => new AnalisisRankingClienteItem
            {
                Id = c.IdCliente,
                Nombre = c.IdClienteNavigation?.Nombre ?? $"Cliente #{c.IdCliente}",
                NumeroCliente = c.IdClienteNavigation?.NumeroCliente,
                Saldo = c.Saldo,
                Subtitulo = c.IdClienteNavigation?.NumeroCliente.HasValue == true
                    ? $"Nº {c.IdClienteNavigation.NumeroCliente}"
                    : null
            })
            .ToList();

        dto.TopCobradores = cobros
            .GroupBy(c => new { c.IdCliente, c.IdClienteNavigation.Nombre, c.IdClienteNavigation.NumeroCliente })
            .Select(g => new AnalisisRankingClienteItem
            {
                Id = g.Key.IdCliente,
                Nombre = g.Key.Nombre,
                NumeroCliente = g.Key.NumeroCliente,
                Importe = g.Sum(x => x.Importe),
                Cantidad = g.Count(),
                Subtitulo = $"{g.Count()} cobros"
            })
            .OrderByDescending(x => x.Importe)
            .Take(12)
            .ToList();

        return dto;
    }

    public async Task<AnalisisInventarioResumen> ObtenerReporteInventario(AnalisisFiltro filtro)
    {
        var (desde, hasta) = ResolverPeriodo(filtro);
        var diasUmbral = filtro.DiasSinMovimiento <= 0 ? 90 : filtro.DiasSinMovimiento;
        var hoy = DateTime.Today;

        var invQ = _db.Inventarios
            .AsNoTracking()
            .Include(i => i.IdProductoNavigation)
            .Include(i => i.IdSucursalNavigation)
            .Include(i => i.InventarioMovimientos)
            .Where(i => i.IdProductoNavigation.Activo)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            invQ = invQ.Where(i => i.IdSucursal == filtro.IdSucursal);
        var inventarios = await invQ.ToListAsync();

        var invRecQ = _db.InventarioRecuperados
            .AsNoTracking()
            .Include(i => i.IdProductoNavigation)
            .Include(i => i.IdSucursalNavigation)
            .Where(i => i.IdProductoNavigation.Activo)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            invRecQ = invRecQ.Where(i => i.IdSucursal == filtro.IdSucursal);
        var inventariosRec = await invRecQ.ToListAsync();

        var items = inventarios.Select(i =>
        {
            var ultimo = i.InventarioMovimientos.OrderByDescending(m => m.Fecha).FirstOrDefault();
            var dias = ultimo == null ? 9999 : (hoy - ultimo.Fecha.Date).Days;
            var clasif = dias >= diasUmbral ? "Sin movimiento" : "Activo";
            return new AnalisisInventarioItem
            {
                IdProducto = i.IdProducto,
                Producto = i.IdProductoNavigation.Nombre,
                Sucursal = i.IdSucursalNavigation?.Nombre ?? "",
                Stock = i.Stock,
                StockMinimo = i.IdProductoNavigation.StockMinimo,
                CostoUnitario = i.IdProductoNavigation.CostoUnitario,
                ValorInversion = i.Stock * i.IdProductoNavigation.CostoUnitario,
                UltimoMovimiento = ultimo?.Fecha,
                DiasSinMovimiento = dias > 9000 ? -1 : dias,
                Clasificacion = clasif,
                EsRecuperado = false
            };
        }).ToList();

        var valorVendible = items.Sum(x => x.ValorInversion);
        var stockVendible = items.Sum(x => x.Stock);
        var valorRec = inventariosRec.Sum(i => i.Stock * i.IdProductoNavigation.CostoUnitario);
        var stockRec = inventariosRec.Sum(i => i.Stock);

        var recuperadosPeriodoQ = _db.ClientesEntregasProductosRecuperados
            .AsNoTracking()
            .Include(r => r.IdProductoNavigation)
            .Include(r => r.IdEntregaNavigation)
                .ThenInclude(e => e.IdClienteNavigation)
            .Where(r => r.IdEntregaNavigation.Fecha >= desde && r.IdEntregaNavigation.Fecha <= hasta)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            recuperadosPeriodoQ = recuperadosPeriodoQ
                .Where(r => r.IdEntregaNavigation.IdClienteNavigation.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            recuperadosPeriodoQ = recuperadosPeriodoQ.Where(r => r.IdEntregaNavigation.IdCliente == filtro.IdCliente);
        if (FiltraEstablecimientos(filtro))
            recuperadosPeriodoQ = recuperadosPeriodoQ
                .Where(r => filtro.IdsEstablecimientos.Contains(r.IdEntregaNavigation.IdEstablecimiento));
        var recuperadosPeriodo = await recuperadosPeriodoQ.ToListAsync();

        var dto = new AnalisisInventarioResumen
        {
            ProductosActivos = inventarios.Select(i => i.IdProducto).Distinct().Count(),
            ProductosBajoMinimo = items.Count(i => i.Stock < i.StockMinimo && i.StockMinimo > 0),
            StockVendibleUnidades = stockVendible,
            StockRecuperadoUnidades = stockRec,
            ValorVendible = valorVendible,
            ValorRecuperado = valorRec,
            ItemsSinMovimiento = items.Count(i => i.Clasificacion == "Sin movimiento" && i.Stock > 0),
            RecuperadoEnPeriodoUnidades = recuperadosPeriodo.Sum(r => r.Cantidad),
            BajoMinimo = items
                .Where(i => i.Stock < i.StockMinimo && i.StockMinimo > 0)
                .OrderBy(i => i.Stock - i.StockMinimo)
                .Take(15)
                .ToList(),
            SinMovimiento = items
                .Where(i => i.Clasificacion == "Sin movimiento" && i.Stock > 0)
                .OrderByDescending(i => i.DiasSinMovimiento)
                .Take(15)
                .ToList(),
            TopStockVendible = items
                .Where(i => i.Stock > 0)
                .OrderByDescending(i => i.Stock)
                .Take(12)
                .ToList(),
            TopStockRecuperado = inventariosRec
                .Where(i => i.Stock > 0)
                .OrderByDescending(i => i.Stock)
                .Take(12)
                .Select(i => new AnalisisInventarioItem
                {
                    IdProducto = i.IdProducto,
                    Producto = i.IdProductoNavigation.Nombre,
                    Sucursal = i.IdSucursalNavigation?.Nombre ?? "",
                    Stock = i.Stock,
                    CostoUnitario = i.IdProductoNavigation.CostoUnitario,
                    ValorInversion = i.Stock * i.IdProductoNavigation.CostoUnitario,
                    EsRecuperado = true
                })
                .ToList(),
            TopRecuperadosPeriodo = recuperadosPeriodo
                .GroupBy(r => new { r.IdProducto, Nombre = r.IdProductoNavigation?.Nombre ?? $"#{r.IdProducto}" })
                .Select(g => new AnalisisRankingProductoItem
                {
                    IdProducto = g.Key.IdProducto,
                    Producto = g.Key.Nombre,
                    Cantidad = g.Sum(r => r.Cantidad),
                    Importe = g.Sum(r => r.SubtotalFinal),
                    Subtitulo = null
                })
                .OrderByDescending(x => x.Cantidad)
                .Take(12)
                .ToList(),
            VendibleVsRecuperado = new List<AnalisisItemCantidad>
            {
                new() { Clave = "Vendible", Etiqueta = "Para entregar", Cantidad = stockVendible, Importe = valorVendible },
                new() { Clave = "Recuperado", Etiqueta = "Recuperado", Cantidad = stockRec, Importe = valorRec }
            }
        };

        return dto;
    }

    public async Task<AnalisisRecorridosResumen> ObtenerReporteRecorridos(AnalisisFiltro filtro)
    {
        var hoy = DateTime.Today;

        var recorridosQ = _db.ClientesRecorridos
            .AsNoTracking()
            .Include(r => r.IdCamionNavigation)
            .Include(r => r.IdDiaNavigation)
            .Include(r => r.IdSemanaNavigation)
            .Include(r => r.IdClienteNavigation)
                .ThenInclude(c => c.IdEstadoNavigation)
            .Where(r => r.Activo)
            .AsQueryable();

        if (FiltraSucursal(filtro))
            recorridosQ = recorridosQ.Where(r => r.IdClienteNavigation.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            recorridosQ = recorridosQ.Where(r => r.IdCliente == filtro.IdCliente);
        if (FiltraEstablecimientos(filtro))
            recorridosQ = recorridosQ.Where(r =>
                r.IdEstablecimiento.HasValue &&
                filtro.IdsEstablecimientos.Contains(r.IdEstablecimiento.Value));

        var recorridos = await recorridosQ.ToListAsync();

        var clientesQ = _db.Clientes
            .AsNoTracking()
            .Include(c => c.IdEstadoNavigation)
            .AsQueryable();
        if (FiltraSucursal(filtro))
            clientesQ = clientesQ.Where(c => c.IdSucursal == filtro.IdSucursal);
        if (FiltraCliente(filtro))
            clientesQ = clientesQ.Where(c => c.Id == filtro.IdCliente);
        var clientes = await clientesQ.ToListAsync();

        var idsEnRuta = recorridos.Select(r => r.IdCliente).Distinct().ToHashSet();
        var activos = clientes.Where(c => EsActivoOperativo(c, hoy)).ToList();
        var fuera = activos.Where(c => !idsEnRuta.Contains(c.Id)).OrderBy(c => c.Nombre).ToList();
        var cobertura = activos.Count > 0
            ? Math.Round((decimal)activos.Count(c => idsEnRuta.Contains(c.Id)) / activos.Count * 100m, 1)
            : 0m;

        return new AnalisisRecorridosResumen
        {
            ParadasActivas = recorridos.Count,
            CamionesConRuta = recorridos.Select(r => r.IdCamion).Distinct().Count(),
            ClientesEnRuta = idsEnRuta.Count,
            ClientesActivosFueraDeRuta = fuera.Count,
            ClientesActivosTotal = activos.Count,
            CoberturaPct = cobertura,
            PorCamion = recorridos
                .GroupBy(r => r.IdCamionNavigation?.Nombre ?? "Sin camión")
                .Select(g => new AnalisisItemCantidad
                {
                    Clave = g.Key,
                    Etiqueta = g.Key,
                    Cantidad = g.Count(),
                    CantidadMovimientos = g.Select(x => x.IdCliente).Distinct().Count(),
                    Subtitulo = $"{g.Select(x => x.IdCliente).Distinct().Count()} clientes"
                })
                .OrderByDescending(x => x.Cantidad)
                .ToList(),
            PorDia = recorridos
                .GroupBy(r => r.IdDiaNavigation?.Nombre ?? $"Día {r.IdDia}")
                .Select(g => new AnalisisItemCantidad
                {
                    Clave = g.Key,
                    Etiqueta = g.Key,
                    Cantidad = g.Count()
                })
                .OrderByDescending(x => x.Cantidad)
                .ToList(),
            PorSemana = recorridos
                .GroupBy(r => r.IdSemanaNavigation?.Nombre ?? $"Semana {r.IdSemana}")
                .Select(g => new AnalisisItemCantidad
                {
                    Clave = g.Key,
                    Etiqueta = g.Key,
                    Cantidad = g.Count()
                })
                .OrderByDescending(x => x.Cantidad)
                .ToList(),
            RankingCargaCamion = recorridos
                .GroupBy(r => r.IdCamionNavigation?.Nombre ?? "Sin camión")
                .Select(g => new AnalisisItemCantidad
                {
                    Clave = g.Key,
                    Etiqueta = g.Key,
                    Cantidad = g.Count(),
                    CantidadMovimientos = g.Select(x => x.IdCliente).Distinct().Count(),
                    Subtitulo = $"{g.Count()} paradas · {g.Select(x => x.IdCliente).Distinct().Count()} clientes"
                })
                .OrderByDescending(x => x.Cantidad)
                .ToList(),
            FueraDeRuta = fuera
                .Take(25)
                .Select(c => new AnalisisRankingClienteItem
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    NumeroCliente = c.NumeroCliente,
                    Subtitulo = c.NumeroCliente.HasValue ? $"Nº {c.NumeroCliente}" : "Activo sin recorrido"
                })
                .ToList()
        };
    }
}
