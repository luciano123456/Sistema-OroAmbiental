using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class EntregasEstado
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<ClientesEntrega> ClientesEntregas { get; set; } = new List<ClientesEntrega>();
}
