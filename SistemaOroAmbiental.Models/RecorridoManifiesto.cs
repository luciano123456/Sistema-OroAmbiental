using System;

namespace SistemaOroAmbiental.Models;

public partial class RecorridoManifiesto
{
    public int Id { get; set; }

    public int IdCamion { get; set; }

    public int? IdSemana { get; set; }

    public int? IdDia { get; set; }

    public int? IdClienteRecorrido { get; set; }

    public int? IdCliente { get; set; }

    public int? IdEstablecimiento { get; set; }

    public int Numero { get; set; }

    public string Nombre { get; set; } = "";

    public string? RazonSocial { get; set; }

    public string? Cuit { get; set; }

    public string? IdEstablecimientoCliente { get; set; }

    public string? Direccion { get; set; }

    public string? Localidad { get; set; }

    public string? Telefono { get; set; }

    public string? Cantidad { get; set; }

    public string? Zona { get; set; }

    public DateTime FechaGeneracion { get; set; }

    public int? IdUsuario { get; set; }

    public virtual Camion IdCamionNavigation { get; set; } = null!;

    public virtual Semana? IdSemanaNavigation { get; set; }

    public virtual Dia? IdDiaNavigation { get; set; }

    public virtual User? IdUsuarioNavigation { get; set; }
}
