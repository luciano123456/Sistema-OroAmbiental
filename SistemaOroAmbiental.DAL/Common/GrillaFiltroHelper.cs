using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.DAL.Common
{
    internal static class GrillaFiltroHelper
    {
        private static readonly Regex RegexAnchor = new(@"^\^|\$$", RegexOptions.Compiled);

        internal static string Normalizar(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return "";

            var v = RegexAnchor.Replace(raw.Trim(), "");
            return v.Trim();
        }

        internal static bool TryGet(Dictionary<string, string>? filters, string key, out string valor)
        {
            valor = "";
            if (filters == null || !filters.TryGetValue(key, out var raw))
                return false;

            valor = Normalizar(raw);
            return !string.IsNullOrWhiteSpace(valor);
        }
    }
}
