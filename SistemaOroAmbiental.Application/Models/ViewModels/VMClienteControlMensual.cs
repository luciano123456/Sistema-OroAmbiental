namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteControlMensual
    {
        public int Id { get; set; }

        public int IdCliente { get; set; }

        public int? IdEstablecimiento { get; set; }

        public int Anio { get; set; }

        public int Mes { get; set; }

        public DateTime? FechaVisita { get; set; }

        public bool SinEntrega { get; set; }

        public int CajasAFavor { get; set; }

        public string? Observaciones { get; set; }

        public decimal AbonoEfectivo { get; set; }

        public decimal AbonoTransferencia { get; set; }

        public DateTime? FechaTransferencia { get; set; }
    }
}
