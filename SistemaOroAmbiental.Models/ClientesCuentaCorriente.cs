using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesCuentaCorriente
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public decimal Saldo { get; set; }

    public virtual ICollection<ClientesCuentaCorrienteMovimiento> ClientesCuentaCorrienteMovimientos { get; set; } = new List<ClientesCuentaCorrienteMovimiento>();

    public virtual Cliente IdClienteNavigation { get; set; } = null!;
}
