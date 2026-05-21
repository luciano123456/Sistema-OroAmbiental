using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesCobro
{
    public int Id { get; set; }

    public int? IdMovCaja { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int? IdEntrega { get; set; }

    public int IdCliente { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = null!;

    public int IdCuenta { get; set; }

    public decimal Importe { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual ClientesEntrega? IdEntregaNavigation { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
