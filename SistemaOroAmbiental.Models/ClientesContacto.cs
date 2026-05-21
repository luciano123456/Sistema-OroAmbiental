using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesContacto
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Puesto { get; set; }

    public string? Telefono { get; set; }

    public string? TelefonoAlt { get; set; }

    public string? Email { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
