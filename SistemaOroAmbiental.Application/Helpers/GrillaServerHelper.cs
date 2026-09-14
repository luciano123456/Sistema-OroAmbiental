using System.Text.RegularExpressions;
using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Helpers
{
    public static class GrillaServerHelper
    {
        private static readonly Regex RegexAnchor = new(@"^\^|\$$", RegexOptions.Compiled);

        public static string NormalizarValorFiltro(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return "";

            var v = raw.Trim();
            v = RegexAnchor.Replace(v, "");
            return v.Trim();
        }

        public static bool TieneFiltro(Dictionary<string, string>? filters, string key, out string valor)
        {
            valor = "";
            if (filters == null || !filters.TryGetValue(key, out var raw))
                return false;

            valor = NormalizarValorFiltro(raw);
            return !string.IsNullOrWhiteSpace(valor);
        }

        public static GrillaPaginadaConsulta ToConsulta(GrillaServerRequest req)
            => new()
            {
                Start = Math.Max(0, req.Start),
                Length = Math.Clamp(req.Length, 1, 200),
                Search = req.Search,
                SortColumn = req.SortColumn,
                SortDesc = req.SortDesc,
                ActivoModo = req.ActivoModo,
                Filters = req.Filters
            };

        public static GrillaServerResponse<T> Respuesta<T>(GrillaServerRequest req, int total, int filtered, List<T> data)
            => new()
            {
                Draw = req.Draw,
                RecordsTotal = total,
                RecordsFiltered = filtered,
                Data = data
            };

        public static int CalcularPagina(int indiceCeroBased, int pageSize)
        {
            if (pageSize <= 0) return 0;
            return indiceCeroBased / pageSize;
        }
    }
}
