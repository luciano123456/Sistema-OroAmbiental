using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Compra
{
    public int Id { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int IdSucursal { get; set; }

    public DateTime Fecha { get; set; }

    public int IdProveedor { get; set; }

    public string? NotaInterna { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Descuentos { get; set; }

    public decimal TotalIva { get; set; }

    public decimal ImporteTotal { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ComprasProducto> ComprasProductos { get; set; } = new List<ComprasProducto>();

    public virtual Proveedore IdProveedorNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ProveedoresPago> ProveedoresPagos { get; set; } = new List<ProveedoresPago>();
}
