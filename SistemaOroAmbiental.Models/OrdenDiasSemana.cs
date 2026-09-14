using System.Globalization;
using System.Text;

namespace SistemaOroAmbiental.Models;

/// <summary>
/// Orden de la semana laboral: lunes a domingo, independiente del Id o del orden alfabético.
/// </summary>
public static class OrdenDiasSemana
{
    public static int Indice(string? nombre)
    {
        var clave = Clave(nombre);
        if (clave.StartsWith("lun")) return 1;
        if (clave.StartsWith("mar")) return 2;
        if (clave.StartsWith("mie")) return 3;
        if (clave.StartsWith("jue")) return 4;
        if (clave.StartsWith("vie")) return 5;
        if (clave.StartsWith("sab")) return 6;
        if (clave.StartsWith("dom")) return 7;
        return 100;
    }

    public static List<T> Ordenar<T>(IEnumerable<T> items, Func<T, string?> nombreSelector)
        => items
            .OrderBy(x => Indice(nombreSelector(x)))
            .ThenBy(x => nombreSelector(x), StringComparer.CurrentCultureIgnoreCase)
            .ToList();

    private static string Clave(string? nombre)
    {
        var texto = (nombre ?? "").Trim().ToLowerInvariant();
        if (texto.Length == 0)
            return "";

        var normalizado = texto.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalizado.Length);
        foreach (var c in normalizado)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        return sb.ToString();
    }
}
