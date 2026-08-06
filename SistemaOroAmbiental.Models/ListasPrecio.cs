using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ListasPrecio
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    /// <summary>Tipo de pago asociado (Efectivo / Transferencia) para totales de hoja de ruta.</summary>
    public int? IdTipoPago { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();

    public virtual ICollection<ClientesEstablecimientosProducto> ClientesEstablecimientosProductos { get; set; } = new List<ClientesEstablecimientosProducto>();

    public virtual ICollection<ClientesEntregasProducto> ClientesEntregasProductos { get; set; } = new List<ClientesEntregasProducto>();

    public virtual ICollection<ClientesEntregasProductosRecuperado> ClientesEntregasProductosRecuperados { get; set; } = new List<ClientesEntregasProductosRecuperado>();

    public virtual TiposPago? IdTipoPagoNavigation { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ProductosPrecio> ProductosPrecios { get; set; } = new List<ProductosPrecio>();
}
