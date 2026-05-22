namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMContratoLista
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public string Cliente { get; set; } = "";
        public int IdEstablecimiento { get; set; }
        public string Establecimiento { get; set; } = "";
        public int IdSucursal { get; set; }
        public string? Sucursal { get; set; }
        public DateTime FechaContrato { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public bool Vigente { get; set; }
        public int CantidadEntregas { get; set; }
        public int CantidadRenovaciones { get; set; }
        public string Etiqueta { get; set; } = "";
        public int? IdUsuarioRegistra { get; set; }
        public DateTime? FechaUsuarioRegistra { get; set; }
        public string? UsuarioRegistra { get; set; }
        public int? IdUsuarioModifica { get; set; }
        public DateTime? FechaUsuarioModifica { get; set; }
        public string? UsuarioModifica { get; set; }
    }

    public class VMContratoGuardar
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public int IdEstablecimiento { get; set; }
        public DateTime FechaContrato { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
    }

    public class VMContratoRenovacion
    {
        public int Id { get; set; }
        public int IdContrato { get; set; }
        public string Tipo { get; set; } = "";
        public DateTime FechaInicio { get; set; }
        public DateTime FechaVencimiento { get; set; }
    }
}
