using System;

namespace SistemaOroAmbiental.Models;

public partial class ClientesControlMensual
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public int Anio { get; set; }

    public int Mes { get; set; }

    public DateTime? FechaVisita { get; set; }

    public bool SinEntrega { get; set; }

    public int CajasAFavor { get; set; }

    public string? Observaciones { get; set; }

    public decimal AbonoEfectivo { get; set; }

    public decimal AbonoTransferencia { get; set; }

    public DateTime? FechaTransferencia { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
