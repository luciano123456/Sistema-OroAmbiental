using System;

namespace SistemaOroAmbiental.Models;

public partial class CertificadosTratamientoContador
{
    public int Id { get; set; }

    public int UltimoNumeroCertificado { get; set; }

    public int UltimoNumeroOrden { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime FechaUsuarioModifica { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
