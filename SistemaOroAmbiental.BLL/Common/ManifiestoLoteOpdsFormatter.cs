using System.Globalization;
using System.Text;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Common;

/// <summary>
/// Archivo plano de Manifiesto por Lotes (instructivo OPDS, hojas 11-12):
/// un renglón por manifiesto, campos con ceros a la izquierda, separados por ;.
/// Idtransportista(10); Idgenerador(10); Idoperador(10); Transacción(10);
/// Categoría Y1=002(3); Kilos 8 pos. 2 dec. sin coma; Fecha dd/MM/yyyy(10);
/// H=008(3); Estado físico 01(2); Origen 01(2); Destino 02 tratador(2);
/// </summary>
public static class ManifiestoLoteOpdsFormatter
{
    public const decimal KilosPorDefecto = 5m;
    public const int MaxRenglones = 5000;

    public static (bool Ok, string Error, byte[] Bytes, string NombreArchivo) Generar(
        ManifiestosHojaDto model,
        string? idTransportistaOpds = null)
    {
        var items = ManifiestoCopiasHelper.UnicosPorRecorrido(model?.Items);
        if (items.Count == 0)
            return (false, "No hay manifiestos para armar el lote.", Array.Empty<byte>(), "");

        var idTransp = PadEntero(PrimerValor(
            idTransportistaOpds,
            ManifiestoDatosEmpresa.TransportistaIdEstablecimiento), 10);
        if (EsCero(idTransp))
            return (false, "Falta el N° de establecimiento OPDS del transportista (el N°Estable. con el que ingresás al manifiesto electrónico).", Array.Empty<byte>(), "");

        var idOperador = PadEntero(ManifiestoDatosEmpresa.OperadorIdEstablecimiento, 10);
        if (EsCero(idOperador))
            return (false, "Falta el N° de establecimiento OPDS del operador.", Array.Empty<byte>(), "");

        var sinId = items
            .Where(x => EsCero(PadEntero(x.IdEstablecimiento, 10)))
            .Select(x => string.IsNullOrWhiteSpace(x.RazonSocial) ? "Sin nombre" : x.RazonSocial.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var conId = items.Where(x => !EsCero(PadEntero(x.IdEstablecimiento, 10))).ToList();
        if (conId.Count == 0)
        {
            var extra = sinId.Count > 8 ? "…" : "";
            return (false,
                "Ningún establecimiento tiene Id del ministerio (N°Estable. OPDS del generador)"
                + (sinId.Count > 0 ? ": " + string.Join(", ", sinId.Take(8)) + extra : "."),
                Array.Empty<byte>(), "");
        }

        if (conId.Count > MaxRenglones)
            return (false, $"El archivo no puede superar {MaxRenglones} manifiestos (tope OPDS).", Array.Empty<byte>(), "");

        var aviso = "";
        if (sinId.Count > 0)
        {
            var extra = sinId.Count > 8 ? "…" : "";
            aviso = "El PDF se generó. El lote OPDS omitió establecimientos sin Id del ministerio: "
                + string.Join(", ", sinId.Take(8)) + extra + ".";
        }

        var fecha = model!.FechaProgramacion == default ? DateTime.Today : model.FechaProgramacion.Date;
        var fechaTxt = fecha.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

        var lineas = new List<string>(conId.Count);
        for (var i = 0; i < conId.Count; i++)
        {
            var item = conId[i];
            lineas.Add(Renglon(
                idTransp,
                PadEntero(item.IdEstablecimiento, 10),
                idOperador,
                PadEntero((i + 1).ToString(CultureInfo.InvariantCulture), 10),
                item.Cantidad,
                fechaTxt));
        }

        var texto = string.Join("\r\n", lineas) + "\r\n";
        var bytes = Encoding.ASCII.GetBytes(texto);
        var nombre = $"{idTransp}_{fecha:yyyyMMdd}.txt";
        return (true, aviso, bytes, nombre);
    }

    public static string NombreArchivo(ManifiestosHojaDto model, DateTime fecha)
    {
        var idTransp = PadEntero(ManifiestoDatosEmpresa.TransportistaIdEstablecimiento, 10);
        return $"{idTransp}_{fecha:yyyyMMdd}.txt";
    }

    /// <summary>
    /// Ejemplo instructivo: 0000041133;0000041137;0000039648;0000000001;002;00030000;31/12/2011;008;01;01;03;
    /// Destino 02 = tratador (el ejemplo del manual usa 03 disposición final).
    /// </summary>
    private static string Renglon(
        string idTransp,
        string idGenerador,
        string idOperador,
        string transaccion,
        string? cantidad,
        string fechaTxt)
    {
        return string.Concat(
            idTransp, ";",
            idGenerador, ";",
            idOperador, ";",
            transaccion, ";",
            PadEntero(ManifiestoDatosEmpresa.LoteCategoriaY1, 3), ";",
            Kilos8(cantidad), ";",
            fechaTxt, ";",
            PadEntero(ManifiestoDatosEmpresa.LotePeligrosidadH62, 3), ";",
            PadEntero(ManifiestoDatosEmpresa.LoteEstadoFisicoSolido, 2), ";",
            PadEntero(ManifiestoDatosEmpresa.LoteOrigenGenerador, 2), ";",
            PadEntero(ManifiestoDatosEmpresa.LoteDestinoTratador, 2), ";");
    }

    private static string Kilos8(string? cantidad)
    {
        var kilos = ParseKilos(cantidad);
        if (kilos <= 0)
            kilos = KilosPorDefecto;
        var centesimas = (int)Math.Round(kilos * 100m, 0, MidpointRounding.AwayFromZero);
        if (centesimas < 0) centesimas = 0;
        if (centesimas > 99_999_999) centesimas = 99_999_999;
        return centesimas.ToString("00000000", CultureInfo.InvariantCulture);
    }

    private static decimal ParseKilos(string? cantidad)
    {
        var txt = (cantidad ?? "").Trim();
        if (txt.Length == 0)
            return 0;
        var corte = txt.IndexOfAny(new[] { ' ', '(' });
        if (corte > 0)
            txt = txt[..corte].Trim();
        txt = txt.Replace(",", ".");
        return decimal.TryParse(txt, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) ? n : 0;
    }

    private static string PadEntero(string? valor, int ancho)
    {
        var digits = new string((valor ?? "").Where(char.IsDigit).ToArray());
        if (digits.Length == 0)
            return new string('0', ancho);
        if (digits.Length > ancho)
            digits = digits[^ancho..];
        return digits.PadLeft(ancho, '0');
    }

    private static bool EsCero(string padded)
        => padded.All(c => c == '0');

    private static string PrimerValor(params string?[] valores)
    {
        foreach (var v in valores)
        {
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        }
        return "";
    }
}
