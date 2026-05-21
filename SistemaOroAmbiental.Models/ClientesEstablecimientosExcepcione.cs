using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEstablecimientosExcepcione
{
    public int Id { get; set; }

    public int IdEstablecimiento { get; set; }

    public DateTime FechaDesde { get; set; }

    public DateTime FechaHasta { get; set; }

    public string NotaInterna { get; set; } = null!;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ClientesEstablecimiento IdEstablecimientoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
