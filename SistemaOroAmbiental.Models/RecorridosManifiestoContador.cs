using System;

namespace SistemaOroAmbiental.Models;

public partial class RecorridosManifiestoContador
{
    public int Id { get; set; }

    public int IdCamion { get; set; }

    public int IdSemana { get; set; }

    public int IdDia { get; set; }

    public int UltimoNumero { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Camion IdCamionNavigation { get; set; } = null!;

    public virtual Semana IdSemanaNavigation { get; set; } = null!;

    public virtual Dia IdDiaNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
