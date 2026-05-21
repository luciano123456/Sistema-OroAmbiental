using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class FeriadosProfesion
{
    public int Id { get; set; }

    public int IdFeriado { get; set; }

    public int IdProfesion { get; set; }

    public virtual Feriado IdFeriadoNavigation { get; set; } = null!;

    public virtual ClientesProfesion IdProfesionNavigation { get; set; } = null!;
}
