using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class TiposContrato
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Contrato> Contratos { get; set; } = new List<Contrato>();

    public virtual ICollection<ContratosDocumento> ContratosDocumentos { get; set; } = new List<ContratosDocumento>();
}
