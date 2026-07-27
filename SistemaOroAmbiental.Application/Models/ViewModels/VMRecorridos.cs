namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMRecorridosMatrizCelda
    {
        public int Id { get; set; }
        public int IdCamion { get; set; }
        public int IdSemana { get; set; }
        public int IdDia { get; set; }
        public string Zona { get; set; } = "";
    }

    public class VMClientesRecorrido
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public int? IdEstablecimiento { get; set; }
        public int IdCamion { get; set; }
        public int IdSemana { get; set; }
        public int IdDia { get; set; }
        public int Posicion { get; set; }
        public bool Activo { get; set; } = true;
    }

    public class VMClientesRecorridoBulk
    {
        public int IdCamion { get; set; }
        public int IdSemana { get; set; }
        public int IdDia { get; set; }
        public List<VMClientesRecorridoBulkItem> Items { get; set; } = new();
    }

    public class VMClientesRecorridoBulkItem
    {
        public int IdCliente { get; set; }
        public int? IdEstablecimiento { get; set; }
    }
}
