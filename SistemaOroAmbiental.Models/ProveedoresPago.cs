using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ProveedoresPago
{
    public int Id { get; set; }

    public int? IdMovCaja { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int? IdCompra { get; set; }

    public int IdProveedor { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = null!;

    public int IdCuenta { get; set; }

    public decimal Importe { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Compra? IdCompraNavigation { get; set; }

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual Proveedore IdProveedorNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
