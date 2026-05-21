using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEstablecimientosDiasHorario
{
    public int Id { get; set; }

    public int IdEstablecimientoDia { get; set; }

    public TimeSpan HorarioDesde { get; set; }

    public TimeSpan HorarioHasta { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ClientesEstablecimientosDia IdEstablecimientoDiaNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
