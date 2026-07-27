using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ContratosDocumento
{
    public int Id { get; set; }

    public int IdContrato { get; set; }

    public int? IdTipoContrato { get; set; }

    public string NombreArchivo { get; set; } = null!;

    public string RutaRelativa { get; set; } = null!;

    public string Extension { get; set; } = null!;

    public long TamanioBytes { get; set; }

    public string Formato { get; set; } = null!;

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public virtual Contrato IdContratoNavigation { get; set; } = null!;

    public virtual TiposContrato? IdTipoContratoNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
