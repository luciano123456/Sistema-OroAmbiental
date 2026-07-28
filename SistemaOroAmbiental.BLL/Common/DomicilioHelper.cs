namespace SistemaOroAmbiental.BLL.Common;

/// <summary>
/// Armado de domicilio y padding para archivo TXT de intercambio con planta de tratamiento.
/// Calle: 40 caracteres | Número: 13 caracteres (según archivo de referencia).
/// </summary>
public static class DomicilioHelper
{
    public const int TxtAnchoCalle = 40;
    public const int TxtAnchoNumero = 13;

    public static string Componer(string? calle, string? numero, string? pisoDepartamento, string? legacy = null)
    {
        var partes = new List<string>();
        if (!string.IsNullOrWhiteSpace(calle)) partes.Add(calle.Trim());
        if (!string.IsNullOrWhiteSpace(numero)) partes.Add(numero.Trim());
        if (!string.IsNullOrWhiteSpace(pisoDepartamento)) partes.Add(pisoDepartamento.Trim());

        if (partes.Count > 0)
            return string.Join(" ", partes);

        return string.IsNullOrWhiteSpace(legacy) ? "" : legacy.Trim();
    }

    public static string PadCampoTxt(string? valor, int ancho)
    {
        var texto = (valor ?? "").Trim();
        if (texto.Length > ancho)
            texto = texto[..ancho];
        return texto.PadRight(ancho);
    }

    public static string PadCalleTxt(string? calle) => PadCampoTxt(calle, TxtAnchoCalle);

    public static string PadNumeroTxt(string? numero) => PadCampoTxt(numero, TxtAnchoNumero);
}
