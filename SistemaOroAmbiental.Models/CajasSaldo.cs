using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class CajasSaldo
{
    public int Id { get; set; }

    public int IdCuenta { get; set; }

    public decimal Saldo { get; set; }

    public virtual ICollection<CajasMovimiento> CajasMovimientos { get; set; } = new List<CajasMovimiento>();

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;
}
