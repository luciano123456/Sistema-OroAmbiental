using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Gasto
{
    public int Id { get; set; }

    public int? IdMovCaja { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCategoria { get; set; }

    public string? NumReferencia { get; set; }

    public string Concepto { get; set; } = null!;

    public int IdCuenta { get; set; }

    public decimal ImporteNeto { get; set; }

    public decimal PorcIva { get; set; }

    public decimal TotalIva { get; set; }

    public decimal OtrosImpuestos { get; set; }

    public decimal ImporteTotal { get; set; }

    public string? NotaInterna { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual GastosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
