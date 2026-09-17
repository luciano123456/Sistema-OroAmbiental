namespace SistemaOroAmbiental.Models;

/// <summary>
/// Auditoría de eliminaciones. Sobrevive al registro borrado (incluye cascada).
/// Tipo: simple, cascada, desvincular.
/// </summary>
public class EliminacionLog
{
    public const string TipoSimple = "simple";
    public const string TipoCascada = "cascada";
    public const string TipoDesvincular = "desvincular";

    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int? IdUsuario { get; set; }

    public string? UsuarioNombre { get; set; }

    public string Entidad { get; set; } = "";

    public int? IdEntidad { get; set; }

    public string? NombreEntidad { get; set; }

    public string Tipo { get; set; } = TipoSimple;

    public string? Detalle { get; set; }

    public string? Ip { get; set; }
}
