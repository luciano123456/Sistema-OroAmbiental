using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Contrato
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public int IdEstablecimiento { get; set; }

    public DateTime FechaContrato { get; set; }

    public DateTime FechaInicio { get; set; }

    public DateTime FechaVencimiento { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ClientesEntrega> ClientesEntregas { get; set; } = new List<ClientesEntrega>();

    public virtual ICollection<ContratosRenovacion> ContratosRenovaciones { get; set; } = new List<ContratosRenovacion>();

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual ClientesEstablecimiento IdEstablecimientoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
