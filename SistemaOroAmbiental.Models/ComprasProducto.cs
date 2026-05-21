using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ComprasProducto
{
    public int Id { get; set; }

    public int? IdInventarioMov { get; set; }

    public int IdCompra { get; set; }

    public int IdProducto { get; set; }

    public decimal Cantidad { get; set; }

    public decimal CostoUnitario { get; set; }

    public decimal PorcDescuento { get; set; }

    public decimal DescUnitario { get; set; }

    public decimal DescTotal { get; set; }

    public decimal CostoUnitCdesc { get; set; }

    public decimal SubtotalCdesc { get; set; }

    public decimal PorcIva { get; set; }

    public decimal Ivaunitario { get; set; }

    public decimal Ivatotal { get; set; }

    public decimal CostoUnitFinal { get; set; }

    public decimal SubtotalFinal { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Compra IdCompraNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
