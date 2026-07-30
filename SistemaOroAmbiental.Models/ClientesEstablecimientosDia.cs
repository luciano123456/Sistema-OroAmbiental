using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEstablecimientosDia
{
    public int Id { get; set; }

    public int IdEstablecimiento { get; set; }

    public int IdDia { get; set; }

    public int? IdCamion { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ClientesEstablecimientosDiasHorario> ClientesEstablecimientosDiasHorarios { get; set; } = new List<ClientesEstablecimientosDiasHorario>();

    public virtual ClientesEstablecimientosDia IdDiaNavigation { get; set; } = null!;

    public virtual ClientesEstablecimiento IdEstablecimientoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ClientesEstablecimientosDia> InverseIdDiaNavigation { get; set; } = new List<ClientesEstablecimientosDia>();
}
