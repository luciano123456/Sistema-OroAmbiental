using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEntregasProducto
{
    public int Id { get; set; }

    public int IdEntrega { get; set; }

    public int IdProducto { get; set; }

    public int? IdListaPrecio { get; set; }

    public int TipoMovimiento { get; set; }

    public decimal Cantidad { get; set; }

    public decimal PrecioVenta { get; set; }

    public decimal CostoUnitario { get; set; }

    public decimal PorcDescuento { get; set; }

    public decimal DescUnitario { get; set; }

    public decimal DescTotal { get; set; }

    public decimal PrecioVentacDesc { get; set; }

    public decimal SubtotalcDesc { get; set; }

    public decimal PorcIva { get; set; }

    public decimal Ivaunitario { get; set; }

    public decimal TotalIva { get; set; }

    public decimal PrecioVentaFinal { get; set; }

    public decimal SubtotalFinal { get; set; }

    public decimal SubtotalCosto { get; set; }

    public decimal Ganancia { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ClientesEntrega IdEntregaNavigation { get; set; } = null!;

    public virtual ListasPrecio? IdListaPrecioNavigation { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
