using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Feriado
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public string Descripcion { get; set; } = null!;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<FeriadosProfesion> FeriadosProfesiones { get; set; } = new List<FeriadosProfesion>();

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
