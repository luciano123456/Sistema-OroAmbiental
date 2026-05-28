using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Cliente
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? TelefonoAlt { get; set; }

    public string? Cuit { get; set; }

    public string? Domicilio { get; set; }

    public int? IdProvincia { get; set; }

    public string? Localidad { get; set; }

    public string? CodPostal { get; set; }

    public int? IdCondicionIva { get; set; }

    public string? Email { get; set; }

    public int? IdProfesion { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public bool Activo { get; set; } = true;

    public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<ClientesEntrega> ClientesEntregas { get; set; } = new List<ClientesEntrega>();

    public virtual ICollection<ClientesContacto> ClientesContactos { get; set; } = new List<ClientesContacto>();

    public virtual ICollection<ClientesCuentaCorriente> ClientesCuentaCorrientes { get; set; } = new List<ClientesCuentaCorriente>();

    public virtual ICollection<ClientesEstablecimiento> ClientesEstablecimientos { get; set; } = new List<ClientesEstablecimiento>();

    public virtual ICollection<Contrato> Contratos { get; set; } = new List<Contrato>();

    public virtual CondicionesIva? IdCondicionIvaNavigation { get; set; }

    public virtual ClientesProfesion? IdProfesionNavigation { get; set; }

    public virtual Provincia? IdProvinciaNavigation { get; set; }

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
