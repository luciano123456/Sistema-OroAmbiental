using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Producto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int IdCategoria { get; set; }

    public int IdMedida { get; set; }

    public decimal CostoUnitario { get; set; }

    public int StockMinimo { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public bool Activo { get; set; } = true;

    public virtual ICollection<ClientesEntregasProducto> ClientesEntregasProductos { get; set; } = new List<ClientesEntregasProducto>();

    public virtual ICollection<ClientesEntregasProductosRecuperado> ClientesEntregasProductosRecuperados { get; set; } = new List<ClientesEntregasProductosRecuperado>();

    public virtual ICollection<ClientesEstablecimientosProducto> ClientesEstablecimientosProductos { get; set; } = new List<ClientesEstablecimientosProducto>();

    public virtual ICollection<ComprasProducto> ComprasProductos { get; set; } = new List<ComprasProducto>();

    public virtual ProductosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual UnidadesMedida IdMedidaNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();

    public virtual ICollection<InventarioRecuperado> InventarioRecuperados { get; set; } = new List<InventarioRecuperado>();

    public virtual ICollection<ProductosPrecio> ProductosPrecios { get; set; } = new List<ProductosPrecio>();
}
