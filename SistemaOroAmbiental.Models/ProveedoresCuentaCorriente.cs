using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ProveedoresCuentaCorriente
{
    public int Id { get; set; }

    public int IdProveedor { get; set; }

    public decimal Saldo { get; set; }

    public virtual Proveedore IdProveedorNavigation { get; set; } = null!;

    public virtual ICollection<ProveedoresCuentaCorrienteMovimiento> ProveedoresCuentaCorrienteMovimientos { get; set; } = new List<ProveedoresCuentaCorrienteMovimiento>();
}
