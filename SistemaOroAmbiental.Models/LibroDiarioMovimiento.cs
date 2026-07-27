using System;

namespace SistemaOroAmbiental.Models;

public partial class LibroDiarioMovimiento
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; }

    public int? IdConcepto { get; set; }

    public string Concepto { get; set; } = null!;

    public int? IdCliente { get; set; }

    public int? IdProveedor { get; set; }

    public string? RecorridoTexto { get; set; }

    public int? IdCamion { get; set; }

    public int? IdSemana { get; set; }

    public int? IdDia { get; set; }

    public decimal Unidades { get; set; }

    public decimal PrecioUnitario { get; set; }

    public decimal Debe { get; set; }

    public decimal Haber { get; set; }

    public decimal PorcIva { get; set; }

    public decimal Iva { get; set; }

    public decimal OtrosImp { get; set; }

    public decimal Total { get; set; }

    public decimal Saldo { get; set; }

    public string? FormaPago { get; set; }

    public bool EsBancario { get; set; }

    public int? IdProducto { get; set; }

    public string? TipoStock { get; set; }

    public int IdUsuarioRegistra { get; set; }

    public DateTime FechaUsuarioRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaUsuarioModifica { get; set; }

    public virtual LibroDiarioConcepto? IdConceptoNavigation { get; set; }

    public virtual Cliente? IdClienteNavigation { get; set; }

    public virtual Proveedore? IdProveedorNavigation { get; set; }

    public virtual Camion? IdCamionNavigation { get; set; }

    public virtual Semana? IdSemanaNavigation { get; set; }

    public virtual Dia? IdDiaNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }

    public virtual User IdUsuarioRegistraNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }
}
