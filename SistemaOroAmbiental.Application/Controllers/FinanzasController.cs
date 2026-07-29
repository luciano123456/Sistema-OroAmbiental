using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.DAL.DataContext;

namespace SistemaOroAmbiental.Application.Controllers
{
    [Authorize]
    public class FinanzasController : Controller
    {
        private readonly ICajasService _cajasService;
        private readonly SistemaOroAmbientalContext _db;
        private static readonly string[] MesesEs =
        {
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        };

        public FinanzasController(ICajasService cajasService, SistemaOroAmbientalContext db)
        {
            _cajasService = cajasService;
            _db = db;
        }

        [AllowAnonymous]
        public async Task<IActionResult> Index(string? tab = null)
        {
            var inicioMes = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            var (saldoEfectivo, saldoBanco, ingEfe, egrEfe, ingBan, egrBan) = await _cajasService.ResumenConsolidado(
                inicioMes,
                DateTime.Today,
                null,
                null);

            ViewBag.SaldoEfectivo = saldoEfectivo;
            ViewBag.SaldoBanco = saldoBanco;
            ViewBag.SaldoTotal = saldoEfectivo + saldoBanco;
            ViewBag.IngresosEfectivo = ingEfe;
            ViewBag.EgresosEfectivo = egrEfe;
            ViewBag.IngresosBanco = ingBan;
            ViewBag.EgresosBanco = egrBan;
            ViewBag.IngresosMes = ingEfe + ingBan;
            ViewBag.EgresosMes = egrEfe + egrBan;
            ViewBag.NetoMes = (ingEfe + ingBan) - (egrEfe + egrBan);
            ViewBag.TabInicial = NormalizarTab(tab);

            return View();
        }

        [AllowAnonymous]
        public IActionResult Efectivo() => RedirectToAction(nameof(Index), new { tab = "efectivo" });

        [AllowAnonymous]
        public IActionResult Bancos() => RedirectToAction(nameof(Index), new { tab = "bancos" });

        [AllowAnonymous]
        public IActionResult Tesoreria() => RedirectToAction(nameof(Index), new { tab = "tesoreria" });

        [HttpPost]
        public async Task<IActionResult> ControlMensual([FromBody] VMFinanzasControlFiltro? filtro)
        {
            try
            {
                filtro ??= new VMFinanzasControlFiltro();

                var anios = (filtro.Anios ?? new List<int>())
                    .Where(a => a >= 2000 && a <= 2100)
                    .Distinct()
                    .OrderByDescending(a => a)
                    .ToList();

                if (anios.Count == 0)
                    anios.Add(DateTime.Today.Year);

                var meses = (filtro.Meses ?? new List<int>())
                    .Where(m => m >= 1 && m <= 12)
                    .Distinct()
                    .OrderBy(m => m)
                    .ToList();

                if (meses.Count == 0)
                    meses = Enumerable.Range(1, 12).ToList();

                var incluirEfectivo = filtro.IncluirEfectivo;
                var incluirBancos = filtro.IncluirBancos;
                var incluirGastos = filtro.IncluirGastos;

                if (!incluirEfectivo && !incluirBancos && !incluirGastos)
                {
                    incluirEfectivo = true;
                    incluirBancos = true;
                }

                var anioMin = anios.Min();
                var anioMax = anios.Max();
                var desde = new DateTime(anioMin, 1, 1);
                var hasta = new DateTime(anioMax, 12, 31, 23, 59, 59);

                var mapa = new Dictionary<(int Anio, int Mes), VMFinanzasControlFila>();

                void Ensure(int anio, int mes)
                {
                    var key = (anio, mes);
                    if (mapa.ContainsKey(key)) return;
                    mapa[key] = new VMFinanzasControlFila
                    {
                        Anio = anio,
                        Mes = mes,
                        MesNombre = MesesEs[mes]
                    };
                }

                foreach (var anio in anios)
                {
                    foreach (var mes in meses)
                        Ensure(anio, mes);
                }

                if (incluirEfectivo || incluirBancos)
                {
                    var movs = await _db.CajasMovimientos
                        .AsNoTracking()
                        .Where(x => x.Fecha >= desde && x.Fecha <= hasta)
                        .Where(x => anios.Contains(x.Fecha.Year) && meses.Contains(x.Fecha.Month))
                        .Select(x => new
                        {
                            Year = x.Fecha.Year,
                            Month = x.Fecha.Month,
                            Tipo = x.IdCajaNavigation.IdCuentaNavigation.TipoCuenta,
                            x.Ingreso,
                            x.Egreso
                        })
                        .ToListAsync();

                    foreach (var m in movs)
                    {
                        var tipo = string.IsNullOrWhiteSpace(m.Tipo) ? "Efectivo" : m.Tipo.Trim();
                        if (tipo == "Efectivo" && !incluirEfectivo) continue;
                        if (tipo == "Banco" && !incluirBancos) continue;
                        if (tipo != "Efectivo" && tipo != "Banco") continue;

                        Ensure(m.Year, m.Month);
                        var fila = mapa[(m.Year, m.Month)];
                        if (tipo == "Efectivo")
                        {
                            fila.IngEfectivo += m.Ingreso;
                            fila.EgrEfectivo += m.Egreso;
                        }
                        else
                        {
                            fila.IngBanco += m.Ingreso;
                            fila.EgrBanco += m.Egreso;
                        }
                    }
                }

                if (incluirGastos)
                {
                    var gastos = await _db.Gastos
                        .AsNoTracking()
                        .Where(x => x.Fecha >= desde && x.Fecha <= hasta)
                        .Where(x => anios.Contains(x.Fecha.Year) && meses.Contains(x.Fecha.Month))
                        .GroupBy(x => new { x.Fecha.Year, x.Fecha.Month })
                        .Select(g => new
                        {
                            g.Key.Year,
                            g.Key.Month,
                            Total = g.Sum(x => x.ImporteTotal)
                        })
                        .ToListAsync();

                    foreach (var g in gastos)
                    {
                        Ensure(g.Year, g.Month);
                        mapa[(g.Year, g.Month)].Gastos = g.Total;
                    }
                }

                var filas = mapa.Values
                    .OrderBy(x => x.Anio)
                    .ThenBy(x => x.Mes)
                    .ToList();

                decimal saldo = 0;
                decimal totalIng = 0;
                decimal totalEgr = 0;
                decimal totalGastos = 0;

                foreach (var f in filas)
                {
                    var ing = 0m;
                    var egr = 0m;

                    if (incluirEfectivo)
                    {
                        ing += f.IngEfectivo;
                        egr += f.EgrEfectivo;
                    }
                    if (incluirBancos)
                    {
                        ing += f.IngBanco;
                        egr += f.EgrBanco;
                    }

                    // Si solo gastos (sin caja), el neto es -gastos.
                    // Si hay caja, los gastos ya impactan egresos; la columna Gastos es informativa.
                    var soloGastos = incluirGastos && !incluirEfectivo && !incluirBancos;
                    if (soloGastos)
                    {
                        egr += f.Gastos;
                    }

                    f.Ingresos = ing;
                    f.Egresos = egr;
                    f.Neto = ing - egr;
                    saldo += f.Neto;
                    f.Saldo = saldo;

                    totalIng += ing;
                    totalEgr += egr;
                    totalGastos += f.Gastos;
                }

                return Ok(new VMFinanzasControlMensual
                {
                    TotalIngresos = totalIng,
                    TotalEgresos = totalEgr,
                    TotalGastos = totalGastos,
                    NetoPeriodo = totalIng - totalEgr,
                    Filas = filas
                });
            }
            catch
            {
                return Ok(new VMFinanzasControlMensual
                {
                    Filas = new List<VMFinanzasControlFila>()
                });
            }
        }

        private static string NormalizarTab(string? tab)
        {
            if (string.IsNullOrWhiteSpace(tab)) return "resumen";
            return tab.Trim().ToLowerInvariant() switch
            {
                "efectivo" => "efectivo",
                "bancos" => "bancos",
                "tesoreria" => "tesoreria",
                "gastos" => "gastos",
                "controlmensual" => "controlMensual",
                "control" => "controlMensual",
                "librodiario" => "resumen",
                "libro" => "resumen",
                _ => "resumen"
            };
        }
    }
}
