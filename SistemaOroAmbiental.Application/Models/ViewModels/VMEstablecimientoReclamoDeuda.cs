namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMEstablecimientoReclamoDeuda
    {
        public int IdEstablecimiento { get; set; }
        public int IdCliente { get; set; }
        public string Establecimiento { get; set; } = "";
        public string? CodigoEstablecimiento { get; set; }
        public string Direccion { get; set; } = "";
        public string Localidad { get; set; } = "";
        public string Partido { get; set; } = "";
        public string Cliente { get; set; } = "";
        public decimal SaldoEstablecimiento { get; set; }
        public decimal SaldoCliente { get; set; }
        public List<VMEstablecimientoReclamoMes> Meses { get; set; } = new();
        public List<VMEstablecimientoReclamoContacto> Contactos { get; set; } = new();
    }

    public class VMEstablecimientoReclamoMes
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public string MesNombre { get; set; } = "";
        public string Periodo { get; set; } = "";
        public DateTime? FechaRecoleccion { get; set; }
        public decimal Adeudado { get; set; }
        public decimal Intereses { get; set; }
        public decimal TotalMes { get; set; }
        public decimal AbonoEfectivo { get; set; }
        public decimal AbonoTransferencia { get; set; }
        public DateTime? FechaTransferencia { get; set; }
        public decimal Haber { get; set; }
        public decimal Restante { get; set; }
        public decimal Saldo { get; set; }
        public string Estado { get; set; } = "";
        public string? NotaImputacion { get; set; }
    }

    public class VMEstablecimientoReclamoContacto
    {
        public int Id { get; set; }
        public string Origen { get; set; } = "";
        public string Nombre { get; set; } = "";
        public string? Puesto { get; set; }
        public string? Telefono { get; set; }
        public string? TelefonoAlt { get; set; }
        public string? Email { get; set; }
    }
}
