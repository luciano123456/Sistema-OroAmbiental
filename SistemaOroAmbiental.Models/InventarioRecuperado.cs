using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class InventarioRecuperado
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdProducto { get; set; }

    public decimal Stock { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual ICollection<InventarioRecuperadoMovimiento> InventarioRecuperadoMovimientos { get; set; } = new List<InventarioRecuperadoMovimiento>();
}
