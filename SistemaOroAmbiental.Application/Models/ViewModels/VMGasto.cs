namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMGasto
    {
        public int Id { get; set; }

        public DateTime Fecha { get; set; }

        public int IdCategoria { get; set; }
        public int IdCuenta { get; set; }

        public string? NumReferencia { get; set; }
        public string Concepto { get; set; } = "";

        public decimal ImporteNeto { get; set; }
        public decimal PorcIva { get; set; }
        public decimal TotalIva { get; set; }
        public decimal OtrosImpuestos { get; set; }
        public decimal ImporteTotal { get; set; }

        public string? NotaInterna { get; set; }

        public int? IdMovCaja { get; set; }

        public string? Categoria { get; set; }
        public string? Cuenta { get; set; }
        public string? Sucursal { get; set; }

        public DateTime? FechaUsuarioRegistra { get; set; }
        public string? UsuarioRegistra { get; set; }
        public DateTime? FechaUsuarioModifica { get; set; }
        public string? UsuarioModifica { get; set; }
    }

    public class VMGastoFiltro
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int? IdCategoria { get; set; }
        public int? IdCuenta { get; set; }
        public int? IdSucursal { get; set; }
        public string? Concepto { get; set; }
        public decimal? ImporteMin { get; set; }
    }
}
