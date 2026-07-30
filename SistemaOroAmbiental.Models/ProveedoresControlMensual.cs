using System;

namespace SistemaOroAmbiental.Models;

public partial class ProveedoresControlMensual
{
    public int Id { get; set; }

    public int IdProveedor { get; set; }

    public int Anio { get; set; }

    public int Mes { get; set; }

    public bool SinCompra { get; set; }

    public string? Observaciones { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Proveedore IdProveedorNavigation { get; set; } = null!;

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
