using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEstablecimientosTercero
{
    public int Id { get; set; }

    public int IdEstablecimiento { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Cuit { get; set; }

    public string? Telefono { get; set; }

    public string? Email { get; set; }

    public string? Banco { get; set; }

    public string? CbuAlias { get; set; }

    public string? Observaciones { get; set; }

    public bool Activo { get; set; } = true;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ClientesEstablecimiento IdEstablecimientoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();
}
