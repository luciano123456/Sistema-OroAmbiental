using System;

namespace SistemaOroAmbiental.Models;

public partial class ClientesCertificadoTratamiento
{
    public int Id { get; set; }

    public int IdCliente { get; set; }

    public int? IdEstablecimiento { get; set; }

    public int? IdManifiestoHistorial { get; set; }

    public int NumeroManifiesto { get; set; }

    public int NumeroCertificado { get; set; }

    public int NumeroOrdenOperaciones { get; set; }

    public DateTime FechaEmision { get; set; }

    public DateTime FechaTratamiento { get; set; }

    public string Cantidad { get; set; } = "";

    public string RazonSocial { get; set; } = "";

    public string? CheNro { get; set; }

    public string? Calle { get; set; }

    public string? NumeroCalle { get; set; }

    public string? Piso { get; set; }

    public string? Localidad { get; set; }

    public string? Cuit { get; set; }

    public string RutaPdf { get; set; } = "";

    public string NombreArchivo { get; set; } = "";

    public DateTime FechaGeneracion { get; set; }

    public int? IdUsuario { get; set; }

    public int? IdCamion { get; set; }

    public int? IdSemana { get; set; }

    public int? IdDia { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual ClientesEstablecimiento? IdEstablecimientoNavigation { get; set; }

    public virtual RecorridoManifiesto? IdManifiestoHistorialNavigation { get; set; }

    public virtual User? IdUsuarioNavigation { get; set; }

    public virtual Camion? IdCamionNavigation { get; set; }
}
