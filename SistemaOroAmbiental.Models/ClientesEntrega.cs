using System;
using System.Collections.Generic;

namespace SistemaOroAmbiental.Models;

public partial class ClientesEntrega
{
    public int Id { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int IdCliente { get; set; }

    /// <summary>Establecimiento al que se imputa la entrega (obligatorio).</summary>
    public int IdEstablecimiento { get; set; }

    public int? IdContrato { get; set; }

    public int? IdEstado { get; set; }

    public int? IdCamion { get; set; }

    public DateTime Fecha { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Descuentos { get; set; }

    public decimal TotalIva { get; set; }

    public decimal ImporteTotal { get; set; }

    public decimal ImporteAbonado { get; set; }

    public decimal Saldo { get; set; }

    public string? NotaInterna { get; set; }

    public string? NotaCliente { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<ClientesEntregasProducto> ClientesEntregasProductos { get; set; } = new List<ClientesEntregasProducto>();

    public virtual ICollection<ClientesEntregasProductosRecuperado> ClientesEntregasProductosRecuperados { get; set; } = new List<ClientesEntregasProductosRecuperado>();

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual ClientesEstablecimiento IdEstablecimientoNavigation { get; set; } = null!;

    public virtual Contrato? IdContratoNavigation { get; set; }

    public virtual EntregasEstado? IdEstadoNavigation { get; set; }

    public virtual Camion? IdCamionNavigation { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;
}
