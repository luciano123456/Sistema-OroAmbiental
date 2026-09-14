using System.Globalization;
using System.Text;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Common;

/// <summary>
/// Archivo de intercambio con Habitat (planta de tratamiento).
/// Instructivo mayo 2023 + patrón del TXT real que se envía a planta:
/// cabecera 001 (26), grupos 002/003/004 (287), pie 999 (22), CRLF, Windows-1252, sin salto final.
/// </summary>
public static class ArchivoIntercambioFormatter
{
    public const int AnchoCuerpo = 287;
    public const string LetraManifiesto = "E";
    public const string UnidadRetiroCaja = "003";
    public const string CodigoDomicilioRetiro = "01";
    public const decimal KilosPorDefecto = 5m;

    public static readonly Encoding Encoding1252 = Encoding.GetEncoding(1252);

    public static byte[] Generar(ArchivoIntercambioDto model)
    {
        var items = model.Items ?? new List<ArchivoIntercambioItemDto>();
        var fecha = model.Fecha.Date;
        var lineas = new List<string>(items.Count * 3 + 2)
        {
            ArmarCabecera()
        };

        foreach (var item in items)
        {
            var habitat = CodigoHabitat(item.NumeroCliente);
            var transp = CodigoTransportista(item.NumeroCliente);
            var opds = CodigoOpds(item.CodigoOpds);
            lineas.Add(ArmarGenerador(item, habitat, transp, opds));
            lineas.Add(ArmarDomicilioRetiro(item, habitat, transp, opds));
            lineas.Add(ArmarManifiesto(item, habitat, transp, opds, fecha));
        }

        var totalRegistros = lineas.Count + 1;
        var generadores = items
            .Select(x => CodigoHabitat(x.NumeroCliente))
            .Distinct(StringComparer.Ordinal)
            .Count();
        lineas.Add(ArmarPie(totalRegistros, generadores, items.Count));

        var texto = string.Join("\r\n", lineas);
        return Encoding1252.GetBytes(texto);
    }

    public static string NombreArchivo(string? camion, DateTime fecha)
    {
        var unidad = SanitizarNombre(camion);
        if (string.IsNullOrWhiteSpace(unidad))
            unidad = "UNIDAD";
        return $"INTERCAMBIO_{unidad}_{fecha:yyyyMMdd}.txt";
    }

    private static string ArmarCabecera()
        => "0010" + "20" + "01OR0000" + "OR" + "05" + "01" + "01" + "06" + "80";

    private static string ArmarGenerador(
        ArchivoIntercambioItemDto item,
        string habitat,
        string transp,
        string opds)
    {
        var sb = new StringBuilder(AnchoCuerpo);
        sb.Append("0020");
        sb.Append(habitat);
        sb.Append(transp);
        sb.Append(opds);
        sb.Append(Alfa(item.RazonSocial, IntercambioTxtCampos.RazonSocial));
        sb.Append(Alfa("", IntercambioTxtCampos.NombreFantasia));
        sb.Append(Alfa(item.Calle, IntercambioTxtCampos.Calle));
        sb.Append(NumeroCalle(item.NumeroCalle));
        sb.Append(Alfa(item.CodigoPostal, IntercambioTxtCampos.CodigoPostal));
        sb.Append(CodigoTabla(item.CodigoLocalidad, IntercambioTxtCampos.CodigoLocalidad));
        sb.Append(CodigoTabla(item.CodigoPartido, IntercambioTxtCampos.CodigoPartido));
        sb.Append(Alfa("", IntercambioTxtCampos.Adicional));
        sb.Append(CodigoProvincia(item.NombreProvincia));
        sb.Append(Alfa("", IntercambioTxtCampos.Telefono));
        sb.Append(CuitTxt(item.Cuit));
        sb.Append(CodigoIva(item.NombreIva));
        sb.Append(TipoGenerador(item.CodigoTipoGenerador));
        sb.Append(Alfa(ManifiestoDatosEmpresa.IntercambioEmail, 30));
        sb.Append(Alfa("", 3));
        return Ajustar(sb, AnchoCuerpo);
    }

    private static string ArmarDomicilioRetiro(
        ArchivoIntercambioItemDto item,
        string habitat,
        string transp,
        string opds)
    {
        var sb = new StringBuilder(AnchoCuerpo);
        sb.Append("0030");
        sb.Append(habitat);
        sb.Append(transp);
        sb.Append(opds);
        sb.Append(CodigoDomicilioRetiro);
        sb.Append(Alfa(item.Calle, IntercambioTxtCampos.Calle));
        sb.Append(NumeroCalle(item.NumeroCalle));
        sb.Append(Alfa(item.CodigoPostal, IntercambioTxtCampos.CodigoPostal));
        sb.Append(CodigoTabla(item.CodigoLocalidad, IntercambioTxtCampos.CodigoLocalidad));
        sb.Append(CodigoTabla(item.CodigoPartido, IntercambioTxtCampos.CodigoPartido));
        sb.Append(Alfa("", IntercambioTxtCampos.Adicional));
        sb.Append(CodigoProvincia(item.NombreProvincia));
        sb.Append(Alfa("", 157));
        return Ajustar(sb, AnchoCuerpo);
    }

    private static string ArmarManifiesto(
        ArchivoIntercambioItemDto item,
        string habitat,
        string transp,
        string opds,
        DateTime fecha)
    {
        var kilos = item.Kilos > 0 ? item.Kilos : KilosPorDefecto;
        var sb = new StringBuilder(AnchoCuerpo);
        sb.Append("0040");
        sb.Append(habitat);
        sb.Append(transp);
        sb.Append(opds);
        sb.Append(fecha.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture));
        sb.Append(LetraManifiesto);
        sb.Append(Entero(item.NumeroManifiesto, 8));
        sb.Append(Alfa("", 8));
        sb.Append(UnidadRetiroCaja);
        sb.Append(Entero(1, 6));
        sb.Append(KilosTxt(kilos));
        sb.Append(Alfa("", 216));
        return Ajustar(sb, AnchoCuerpo);
    }

    private static string ArmarPie(int totalRegistros, int generadores, int manifiestos)
        => "9999" + Entero(totalRegistros, 6) + Entero(generadores, 6) + Entero(manifiestos, 6);

    public static string CodigoHabitat(int numeroCliente)
    {
        var n = Math.Max(0, numeroCliente);
        var interno = n <= 9999
            ? "OR" + n.ToString("D4", CultureInfo.InvariantCulture)
            : "OR" + n.ToString(CultureInfo.InvariantCulture);
        return EnteroTexto(interno, 8);
    }

    public static string CodigoTransportista(int numeroCliente)
        => Entero(Math.Max(0, numeroCliente), 5);

    public static string CodigoOpds(string? valor)
    {
        var digits = SoloDigitos(valor);
        if (digits.Length == 0)
            return Entero(0, 8);
        if (digits.Length > 8)
            digits = digits[^8..];
        return digits.PadLeft(8, '0');
    }

    private static string CodigoProvincia(string? nombre)
    {
        var n = (nombre ?? "").Trim();
        if (n.Length == 0)
            return "02";
        if (n.Contains("Ciudad", StringComparison.OrdinalIgnoreCase)
            || n.Contains("CABA", StringComparison.OrdinalIgnoreCase)
            || n.Contains("Capital", StringComparison.OrdinalIgnoreCase)
            || n.Contains("Autónoma", StringComparison.OrdinalIgnoreCase)
            || n.Contains("Autonoma", StringComparison.OrdinalIgnoreCase))
            return "01";
        return "02";
    }

    private static string CodigoIva(string? nombre)
    {
        var n = (nombre ?? "").Trim().ToLowerInvariant();
        if (n.Contains("consumidor"))
            return "01";
        if (n.Contains("exent"))
            return "02";
        if (n.Contains("no responsable"))
            return "03";
        if (n.Contains("no inscript"))
            return "04";
        if (n.Contains("monotribut"))
            return "05";
        if (n.Contains("inscript"))
            return "06";
        return "06";
    }

    private static string TipoGenerador(string? codigo)
    {
        var c = (codigo ?? "").Trim().ToUpperInvariant();
        if (c.StartsWith("I"))
            return "I";
        return "P";
    }

    private static string CuitTxt(string? cuit)
    {
        var digits = SoloDigitos(cuit);
        if (digits.Length == 11)
            return $"{digits[..2]}-{digits[2..10]}-{digits[10]}";
        return Alfa(cuit, IntercambioTxtCampos.Cuit);
    }

    private static string NumeroCalle(string? numero)
    {
        var txt = (numero ?? "").Trim();
        if (txt.Length == 0)
            return Entero(0, 5);
        if (txt.All(char.IsDigit))
        {
            if (txt.Length > IntercambioTxtCampos.Numero)
                txt = txt[^IntercambioTxtCampos.Numero..];
            return txt.PadLeft(IntercambioTxtCampos.Numero, '0');
        }
        return Alfa(txt, IntercambioTxtCampos.Numero);
    }

    private static string CodigoTabla(string? codigo, int ancho)
    {
        var digits = SoloDigitos(codigo);
        if (digits.Length == 0)
            return Alfa("", ancho);
        if (digits.Length > ancho)
            digits = digits[^ancho..];
        return digits.PadLeft(ancho, '0');
    }

    private static string KilosTxt(decimal kilos)
    {
        var valor = Math.Round(kilos, 3, MidpointRounding.AwayFromZero);
        if (valor < 0) valor = 0;
        if (valor > 999999.999m) valor = 999999.999m;
        return valor.ToString("000000.000", CultureInfo.InvariantCulture);
    }

    private static string Alfa(string? valor, int ancho)
    {
        var texto = (valor ?? "").Trim();
        if (texto.Length > ancho)
            texto = texto[..ancho];
        return texto.PadRight(ancho);
    }

    private static string Entero(int valor, int ancho)
        => Math.Max(0, valor).ToString(CultureInfo.InvariantCulture).PadLeft(ancho, '0');

    private static string EnteroTexto(string valor, int ancho)
    {
        var txt = (valor ?? "").Trim();
        if (txt.Length > ancho)
            txt = txt[^ancho..];
        return txt.PadLeft(ancho, '0');
    }

    private static string Ajustar(StringBuilder sb, int ancho)
    {
        if (sb.Length < ancho)
            sb.Append(' ', ancho - sb.Length);
        if (sb.Length > ancho)
            sb.Length = ancho;
        return sb.ToString();
    }

    private static string SoloDigitos(string? valor)
        => new string((valor ?? "").Where(char.IsDigit).ToArray());

    private static string SanitizarNombre(string? valor)
    {
        var txt = (valor ?? "").Trim();
        if (txt.Length == 0)
            return "";
        var invalidos = Path.GetInvalidFileNameChars();
        var chars = txt.Select(c => invalidos.Contains(c) ? '_' : c).ToArray();
        var limpio = new string(chars).Replace(' ', '_');
        return limpio.Length > 40 ? limpio[..40] : limpio;
    }
}
