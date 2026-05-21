using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesProfesion
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();

    public virtual ICollection<FeriadosProfesion> FeriadosProfesiones { get; set; } = new List<FeriadosProfesion>();
}
