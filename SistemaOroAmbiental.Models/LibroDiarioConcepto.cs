using System;

namespace SistemaOroAmbiental.Models;

public partial class LibroDiarioConcepto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public decimal PrecioUnitario { get; set; }

    public int? IdProducto { get; set; }

    public bool AfectaInventario { get; set; }

    public string? TipoStock { get; set; }

    public bool Activo { get; set; } = true;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual ICollection<LibroDiarioMovimiento> LibroDiarioMovimientos { get; set; } = new List<LibroDiarioMovimiento>();
}
