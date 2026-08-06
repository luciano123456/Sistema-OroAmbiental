using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEstablecimientosProducto
{
    public int Id { get; set; }

    public int IdEstablecimiento { get; set; }

    public int IdProducto { get; set; }

    public decimal Cantidad { get; set; }

    public int? IdListaPrecio { get; set; }

    public decimal PrecioVenta { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ClientesEstablecimiento IdEstablecimientoNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ListasPrecio? IdListaPrecioNavigation { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
