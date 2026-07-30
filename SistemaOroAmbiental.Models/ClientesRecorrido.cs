using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesRecorrido
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public int? IdEstablecimiento { get; set; }

    public int IdCamion { get; set; }

    public int IdSemana { get; set; }

    public int IdDia { get; set; }

    public int Posicion { get; set; }

    public bool Activo { get; set; } = true;

    public string? Observacion { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual ClientesEstablecimiento? IdEstablecimientoNavigation { get; set; }

    public virtual Camion IdCamionNavigation { get; set; } = null!;

    public virtual Semana IdSemanaNavigation { get; set; } = null!;

    public virtual Dia IdDiaNavigation { get; set; } = null!;

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
