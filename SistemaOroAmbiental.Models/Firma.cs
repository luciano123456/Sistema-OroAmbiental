namespace SistemaOroAmbiental.Models;

public partial class Firma
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? FirmaArchivo { get; set; }

    public bool Activo { get; set; } = true;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
