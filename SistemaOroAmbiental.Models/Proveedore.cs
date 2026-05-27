using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class Proveedore
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? Email { get; set; }

    public int IdCondicionIva { get; set; }

    public string Cuit { get; set; } = null!;

    public int? IdBanco { get; set; }

    public string? AliasBancario { get; set; }

    public string? CbuBancario { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<Compra> Compras { get; set; } = new List<Compra>();

    public virtual Banco? IdBancoNavigation { get; set; }

    public virtual CondicionesIva IdCondicionIvaNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual ICollection<ProveedoresContacto> ProveedoresContactos { get; set; } = new List<ProveedoresContacto>();

    public virtual ICollection<ProveedoresCuentaCorriente> ProveedoresCuentaCorrientes { get; set; } = new List<ProveedoresCuentaCorriente>();

    public virtual ICollection<ProveedoresPago> ProveedoresPagos { get; set; } = new List<ProveedoresPago>();
}
