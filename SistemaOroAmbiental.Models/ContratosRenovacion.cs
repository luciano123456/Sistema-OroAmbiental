using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ContratosRenovacion
{
    public int Id { get; set; }

    public int IdContrato { get; set; }

    public string Tipo { get; set; } = null!;

    public DateTime FechaInicio { get; set; }

    public DateTime FechaVencimiento { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Contrato IdContratoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
