using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class TiposPago
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    /// <summary>Código estable para agrupar (Efectivo, Transferencia).</summary>
    public string Codigo { get; set; } = null!;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ListasPrecio> ListasPrecios { get; set; } = new List<ListasPrecio>();
}
