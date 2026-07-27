using System;

namespace SistemaOroAmbiental.Models;

public partial class ProductosCostoHistorial
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public DateTime Fecha { get; set; }

    public decimal CostoAnterior { get; set; }

    public decimal CostoNuevo { get; set; }

    public string Origen { get; set; } = null!;

    public int? IdCompra { get; set; }

    public int? IdUsuario { get; set; }

    public virtual Compra? IdCompraNavigation { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioNavigation { get; set; }
}
