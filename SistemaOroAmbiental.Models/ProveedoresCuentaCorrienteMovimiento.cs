using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ProveedoresCuentaCorrienteMovimiento
{
    public int Id { get; set; }

    public int IdCuentaCorriente { get; set; }

    public string TipoMovimiento { get; set; } = null!;

    public int IdMovimiento { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Debe { get; set; }

    public decimal Haber { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ProveedoresCuentaCorriente IdCuentaCorrienteNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
