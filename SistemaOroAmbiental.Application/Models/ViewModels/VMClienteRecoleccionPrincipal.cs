namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMClienteRecoleccionPrincipal
    {
        public int IdCliente { get; set; }
        public int IdEstablecimiento { get; set; }
        public string? IdEstablecimientoCliente { get; set; }
        public int IdDiaRecoleccion { get; set; }
        public int IdSemanaRecoleccion { get; set; }
        public int? IdCamion { get; set; }
        public int? IdListaPrecio { get; set; }
        public string HorarioRecoleccionDesde { get; set; } = "";
        public string HorarioRecoleccionHasta { get; set; } = "";
        public string? DiasHorarios { get; set; }
        public int? OrdenRecorrido { get; set; }
        public decimal? Kilos { get; set; }
        public int? IdTipoGenerador { get; set; }
        /// <summary>Todos los dias con unidad asignada (1=Lunes ... 7=Domingo).</summary>
        public List<VMClienteRecoleccionDiaAdicional> DiasSemana { get; set; } = new();
        public List<VMClienteRecoleccionDiaAdicional> DiasAdicionales { get; set; } = new();
    }

    public class VMClienteRecoleccionDiaAdicional
    {
        public int IdDia { get; set; }
        public int? IdCamion { get; set; }
    }
}
