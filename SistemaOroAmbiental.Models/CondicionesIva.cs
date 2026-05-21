using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class CondicionesIva
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();

    public virtual ICollection<Proveedore> Proveedores { get; set; } = new List<Proveedore>();
}
