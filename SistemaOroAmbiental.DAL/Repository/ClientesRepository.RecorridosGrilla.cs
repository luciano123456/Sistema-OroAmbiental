using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public partial class ClientesRepository
    {
        private sealed class FilaRecGrilla
        {
            public int IdCliente { get; set; }
            public int IdSemana { get; set; }
            public int IdDia { get; set; }
            public int IdCamion { get; set; }
            public string? Semana { get; set; }
            public string? Dia { get; set; }
            public string? Camion { get; set; }
            public string? Zona { get; set; }
            public int Orden { get; set; }
        }

        public async Task<Dictionary<int, string>> ObtenerTextosRecorrido(IReadOnlyCollection<int> idsClientes)
        {
            var ids = idsClientes?.Where(id => id > 0).Distinct().ToList() ?? new List<int>();
            if (ids.Count == 0)
                return new Dictionary<int, string>();

            var activos = await _db.ClientesRecorridos.AsNoTracking()
                .Where(r => r.Activo && ids.Contains(r.IdCliente))
                .Select(r => new FilaRecGrilla
                {
                    IdCliente = r.IdCliente,
                    IdSemana = r.IdSemana,
                    IdDia = r.IdDia,
                    IdCamion = r.IdCamion,
                    Semana = r.IdSemanaNavigation.Nombre,
                    Dia = r.IdDiaNavigation.Nombre,
                    Camion = r.IdCamionNavigation.Nombre,
                    Zona = _db.RecorridosMatriz
                        .Where(m => m.IdCamion == r.IdCamion && m.IdSemana == r.IdSemana && m.IdDia == r.IdDia)
                        .Select(m => m.Zona)
                        .FirstOrDefault(),
                    Orden = r.Posicion
                })
                .ToListAsync();

            var conActivos = activos.Select(x => x.IdCliente).ToHashSet();
            var sin = ids.Where(id => !conActivos.Contains(id)).ToList();
            var filas = activos;

            if (sin.Count > 0)
            {
                var prim = _db.ClientesEstablecimientos.AsNoTracking()
                    .Where(e => sin.Contains(e.IdCliente)
                        && (e.IdDiaRecoleccion != null || e.IdSemanaRecoleccion != null || e.IdCamion != null))
                    .Select(e => new FilaRecGrilla
                    {
                        IdCliente = e.IdCliente,
                        IdSemana = e.IdSemanaRecoleccion ?? 0,
                        IdDia = e.IdDiaRecoleccion ?? 0,
                        IdCamion = e.IdCamion ?? 0,
                        Semana = e.IdSemanaRecoleccionNavigation != null ? e.IdSemanaRecoleccionNavigation.Nombre : null,
                        Dia = e.IdDiaRecoleccionNavigation != null ? e.IdDiaRecoleccionNavigation.Nombre : null,
                        Camion = e.IdCamionNavigation != null ? e.IdCamionNavigation.Nombre : null,
                        Zona = _db.RecorridosMatriz
                            .Where(m =>
                                e.IdCamion != null
                                && e.IdSemanaRecoleccion != null
                                && e.IdDiaRecoleccion != null
                                && m.IdCamion == e.IdCamion
                                && m.IdSemana == e.IdSemanaRecoleccion
                                && m.IdDia == e.IdDiaRecoleccion)
                            .Select(m => m.Zona)
                            .FirstOrDefault(),
                        Orden = e.OrdenRecorrido ?? 0
                    });

                var extra = _db.ClientesEstablecimientosDias.AsNoTracking()
                    .Where(d => sin.Contains(d.IdEstablecimientoNavigation.IdCliente))
                    .Select(d => new FilaRecGrilla
                    {
                        IdCliente = d.IdEstablecimientoNavigation.IdCliente,
                        IdSemana = d.IdEstablecimientoNavigation.IdSemanaRecoleccion ?? 0,
                        IdDia = d.IdDia,
                        IdCamion = d.IdCamion ?? d.IdEstablecimientoNavigation.IdCamion ?? 0,
                        Semana = d.IdEstablecimientoNavigation.IdSemanaRecoleccionNavigation != null
                            ? d.IdEstablecimientoNavigation.IdSemanaRecoleccionNavigation.Nombre
                            : null,
                        Dia = _db.Dias.Where(dia => dia.Id == d.IdDia).Select(dia => dia.Nombre).FirstOrDefault(),
                        Camion = _db.Camiones
                            .Where(cam => cam.Id == (d.IdCamion ?? d.IdEstablecimientoNavigation.IdCamion))
                            .Select(cam => cam.Nombre)
                            .FirstOrDefault(),
                        Zona = _db.RecorridosMatriz
                            .Where(m =>
                                (d.IdCamion ?? d.IdEstablecimientoNavigation.IdCamion) != null
                                && d.IdEstablecimientoNavigation.IdSemanaRecoleccion != null
                                && m.IdCamion == (d.IdCamion ?? d.IdEstablecimientoNavigation.IdCamion)
                                && m.IdSemana == d.IdEstablecimientoNavigation.IdSemanaRecoleccion
                                && m.IdDia == d.IdDia)
                            .Select(m => m.Zona)
                            .FirstOrDefault(),
                        Orden = 1000 + d.IdDia
                    });

                filas = activos.Concat(await prim.Concat(extra).ToListAsync()).ToList();
            }

            return filas
                .GroupBy(f => f.IdCliente)
                .ToDictionary(g => g.Key, g => ArmarTextoRecorridos(g));
        }

        private IQueryable<Cliente> AplicarFiltrosColumnasRecorrido(IQueryable<Cliente> query, Dictionary<string, string>? filters)
        {
            if (filters == null)
                return query;

            if (GrillaFiltroHelper.TryGet(filters, "Recorrido", out var siNo))
            {
                var v = siNo.Trim();
                var matchSi = "si".Contains(v, StringComparison.OrdinalIgnoreCase);
                var matchNo = "no".Contains(v, StringComparison.OrdinalIgnoreCase);
                if (matchSi && !matchNo)
                    query = FiltrarConRecorrido(query);
                else if (matchNo && !matchSi)
                    query = FiltrarSinRecorrido(query);
                else if (!matchSi && !matchNo)
                    query = query.Where(c => false);
            }

            if (GrillaFiltroHelper.TryGet(filters, "Recorridos", out var detalle))
                query = FiltrarTextoRecorridos(query, detalle);

            return query;
        }

        private IQueryable<Cliente> FiltrarTextoRecorridos(IQueryable<Cliente> query, string raw)
        {
            foreach (var token in TokenizarRecorrido(raw))
            {
                var p = token;
                int? semId = IdSemanaDesdeToken(p);
                query = query.Where(c =>
                    (
                        _db.ClientesRecorridos.Any(r => r.Activo && r.IdCliente == c.Id)
                        && _db.ClientesRecorridos.Any(r =>
                            r.Activo
                            && r.IdCliente == c.Id
                            && (
                                r.IdDiaNavigation.Nombre.Contains(p)
                                || r.IdSemanaNavigation.Nombre.Contains(p)
                                || r.IdCamionNavigation.Nombre.Contains(p)
                                || (semId != null && r.IdSemana == semId)
                                || _db.RecorridosMatriz.Any(m =>
                                    m.IdCamion == r.IdCamion
                                    && m.IdSemana == r.IdSemana
                                    && m.IdDia == r.IdDia
                                    && m.Zona.Contains(p))
                            ))
                    )
                    || (
                        !_db.ClientesRecorridos.Any(r => r.Activo && r.IdCliente == c.Id)
                        && (
                            _db.ClientesEstablecimientos.Any(e =>
                                e.IdCliente == c.Id
                                && (e.IdDiaRecoleccion != null || e.IdSemanaRecoleccion != null || e.IdCamion != null)
                                && (
                                    (e.IdDiaRecoleccionNavigation != null && e.IdDiaRecoleccionNavigation.Nombre.Contains(p))
                                    || (e.IdSemanaRecoleccionNavigation != null && e.IdSemanaRecoleccionNavigation.Nombre.Contains(p))
                                    || (semId != null && e.IdSemanaRecoleccion == semId)
                                    || (e.IdCamionNavigation != null && e.IdCamionNavigation.Nombre.Contains(p))
                                    || (
                                        e.IdCamion != null
                                        && e.IdSemanaRecoleccion != null
                                        && e.IdDiaRecoleccion != null
                                        && _db.RecorridosMatriz.Any(m =>
                                            m.IdCamion == e.IdCamion.Value
                                            && m.IdSemana == e.IdSemanaRecoleccion.Value
                                            && m.IdDia == e.IdDiaRecoleccion.Value
                                            && m.Zona.Contains(p)))
                                ))
                            || _db.ClientesEstablecimientosDias.Any(d =>
                                d.IdEstablecimientoNavigation.IdCliente == c.Id
                                && (
                                    _db.Dias.Any(dia => dia.Id == d.IdDia && dia.Nombre.Contains(p))
                                    || (d.IdEstablecimientoNavigation.IdSemanaRecoleccionNavigation != null
                                        && d.IdEstablecimientoNavigation.IdSemanaRecoleccionNavigation.Nombre.Contains(p))
                                    || (semId != null && d.IdEstablecimientoNavigation.IdSemanaRecoleccion == semId)
                                    || (d.IdCamion != null && _db.Camiones.Any(cam => cam.Id == d.IdCamion.Value && cam.Nombre.Contains(p)))
                                    || (d.IdCamion == null
                                        && d.IdEstablecimientoNavigation.IdCamionNavigation != null
                                        && d.IdEstablecimientoNavigation.IdCamionNavigation.Nombre.Contains(p))
                                    || (
                                        d.IdCamion != null
                                        && d.IdEstablecimientoNavigation.IdSemanaRecoleccion != null
                                        && _db.RecorridosMatriz.Any(m =>
                                            m.IdCamion == d.IdCamion.Value
                                            && m.IdSemana == d.IdEstablecimientoNavigation.IdSemanaRecoleccion.Value
                                            && m.IdDia == d.IdDia
                                            && m.Zona.Contains(p)))
                                    || (
                                        d.IdCamion == null
                                        && d.IdEstablecimientoNavigation.IdCamion != null
                                        && d.IdEstablecimientoNavigation.IdSemanaRecoleccion != null
                                        && _db.RecorridosMatriz.Any(m =>
                                            m.IdCamion == d.IdEstablecimientoNavigation.IdCamion.Value
                                            && m.IdSemana == d.IdEstablecimientoNavigation.IdSemanaRecoleccion.Value
                                            && m.IdDia == d.IdDia
                                            && m.Zona.Contains(p)))
                                ))
                        )
                    ));
            }

            return query;
        }

        private static List<string> TokenizarRecorrido(string raw)
        {
            var list = new List<string>();
            foreach (var part in raw.Split(new[] { ' ', '\t', '|', '·', '•', ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var t = part.Trim().Trim('.', '·');
                if (t.Length == 0)
                    continue;
                if (!list.Exists(x => x.Equals(t, StringComparison.OrdinalIgnoreCase)))
                    list.Add(t);
            }

            if (list.Count == 0 && !string.IsNullOrWhiteSpace(raw))
                list.Add(raw.Trim());

            return list;
        }

        private static int? IdSemanaDesdeToken(string token)
        {
            var t = token.Trim();
            if (t.Length >= 2 && (t[0] == 'S' || t[0] == 's') && int.TryParse(t.AsSpan(1), out var n) && n > 0)
                return n;
            return null;
        }

        private static string ArmarTextoRecorridos(IEnumerable<FilaRecGrilla> filas)
        {
            var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var partes = new List<string>();
            foreach (var f in filas
                .OrderBy(x => x.IdSemana)
                .ThenBy(x => x.IdDia)
                .ThenBy(x => x.IdCamion)
                .ThenBy(x => x.Orden))
            {
                var txt = FormatearLineaRecorrido(f);
                if (txt.Length == 0 || !vistos.Add(txt))
                    continue;
                partes.Add(txt);
            }

            return string.Join(" | ", partes);
        }

        private static string FormatearLineaRecorrido(FilaRecGrilla f)
        {
            var sem = EtiquetaSemanaRec(f.Semana, f.IdSemana);
            var dia = EtiquetaDiaRec(f.Dia, f.IdDia);
            var camion = string.IsNullOrWhiteSpace(f.Camion)
                ? (f.IdCamion > 0 ? "Camion " + f.IdCamion : "")
                : f.Camion.Trim();
            var zona = string.IsNullOrWhiteSpace(f.Zona) ? "" : f.Zona.Trim();

            var cuando = "";
            if (sem.Length > 0 && dia.Length > 0)
                cuando = sem + " " + dia;
            else if (sem.Length > 0)
                cuando = sem;
            else if (dia.Length > 0)
                cuando = dia;

            var partes = new List<string>(3);
            if (cuando.Length > 0) partes.Add(cuando);
            if (camion.Length > 0) partes.Add(camion);
            if (zona.Length > 0) partes.Add(zona);
            return string.Join(" · ", partes);
        }

        private static string EtiquetaSemanaRec(string? nombre, int id)
        {
            var n = (nombre ?? "").Trim();
            if (n.Length == 0)
                return id > 0 ? "S" + id : "";

            var sin = SinAcento(n);
            var num = System.Text.RegularExpressions.Regex.Match(sin, @"(\d+)");
            if (num.Success && sin.Contains("semana", StringComparison.OrdinalIgnoreCase))
                return "S" + num.Groups[1].Value;
            if (num.Success && (sin.Equals(num.Value, StringComparison.OrdinalIgnoreCase)
                || sin.Equals("S" + num.Value, StringComparison.OrdinalIgnoreCase)))
                return "S" + num.Groups[1].Value;

            return n;
        }

        private static readonly string[] DiasCortosRec = { "", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom" };

        private static string EtiquetaDiaRec(string? nombre, int id)
        {
            if (!string.IsNullOrWhiteSpace(nombre))
            {
                var key = SinAcento(nombre.Trim()).ToLowerInvariant();
                var corto = key switch
                {
                    "lunes" => "Lun",
                    "martes" => "Mar",
                    "miercoles" => "Mie",
                    "jueves" => "Jue",
                    "viernes" => "Vie",
                    "sabado" => "Sab",
                    "domingo" => "Dom",
                    _ => ""
                };
                if (corto.Length > 0)
                    return corto;
                return nombre.Trim().Length <= 3 ? nombre.Trim() : nombre.Trim()[..3];
            }

            return id >= 1 && id <= 7 ? DiasCortosRec[id] : "";
        }

        private static string SinAcento(string texto)
        {
            var form = texto.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(form.Length);
            foreach (var ch in form)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    sb.Append(ch);
            }
            return sb.ToString();
        }
    }
}
