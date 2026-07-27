using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class RecorridosMatriz
{
    public int Id { get; set; }

    public int IdCamion { get; set; }

    public int IdSemana { get; set; }

    public int IdDia { get; set; }

    public string Zona { get; set; } = null!;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Camion IdCamionNavigation { get; set; } = null!;

    public virtual Semana IdSemanaNavigation { get; set; } = null!;

    public virtual Dia IdDiaNavigation { get; set; } = null!;

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
