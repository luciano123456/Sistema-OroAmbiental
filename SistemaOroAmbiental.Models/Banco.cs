using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Banco
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Proveedore> Proveedores { get; set; } = new List<Proveedore>();
}
