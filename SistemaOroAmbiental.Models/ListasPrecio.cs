using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ListasPrecio
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ProductosPrecio> ProductosPrecios { get; set; } = new List<ProductosPrecio>();
}
