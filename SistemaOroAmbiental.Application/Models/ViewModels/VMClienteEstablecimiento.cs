namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteEstablecimiento
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public string? IdEstablecimientoCliente { get; set; }
        public string Nombre { get; set; } = "";
        public string? Cuit { get; set; }
        public int? IdCondicionIva { get; set; }
        public string? Domicilio { get; set; }
        public string? Calle { get; set; }
        public string? Numero { get; set; }
        public string? PisoDepartamento { get; set; }
        public int? IdTipoGenerador { get; set; }
        public string? TipoGenerador { get; set; }
        public int? IdProvincia { get; set; }
        public int? IdPartido { get; set; }
        public int? IdLocalidad { get; set; }
        public string? Localidad { get; set; }
        public string? CodPostal { get; set; }
        public bool ImpuestoIva { get; set; }
        public int IdDiaRecoleccion { get; set; }
        public int IdSemanaRecoleccion { get; set; }
        public int? IdListaPrecio { get; set; }
        public int? IdCamion { get; set; }
        public int? OrdenRecorrido { get; set; }
        public decimal? Kilos { get; set; }
        public string HorarioRecoleccionDesde { get; set; } = "";
        public string HorarioRecoleccionHasta { get; set; } = "";
        public string? DiasHorarios { get; set; }

        public string? Cliente { get; set; }
        public string? Provincia { get; set; }
        public string? Partido { get; set; }
        public string? CodigoPartido { get; set; }
        public string? CodigoLocalidad { get; set; }
        public string? CondicionIva { get; set; }
        public string? DiaRecoleccion { get; set; }
        public string? SemanaRecoleccion { get; set; }
        public string? ListaPrecio { get; set; }
        public string? Camion { get; set; }

        public int IdUsuarioRegistra { get; set; }
        public DateTime FechaUsuarioRegistra { get; set; }
        public string? UsuarioRegistra { get; set; }
        public int? IdUsuarioModifica { get; set; }
        public DateTime? FechaUsuarioModifica { get; set; }
        public string? UsuarioModifica { get; set; }
    }
}
