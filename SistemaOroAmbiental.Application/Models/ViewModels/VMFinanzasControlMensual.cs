namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMFinanzasControlFiltro
    {
        public List<int>? Anios { get; set; }
        public List<int>? Meses { get; set; }
        public bool IncluirEfectivo { get; set; } = true;
        public bool IncluirBancos { get; set; } = true;
        public bool IncluirGastos { get; set; } = true;
    }

    public class VMFinanzasControlMensual
    {
        public decimal TotalIngresos { get; set; }
        public decimal TotalEgresos { get; set; }
        public decimal TotalGastos { get; set; }
        public decimal NetoPeriodo { get; set; }
        public List<VMFinanzasControlFila> Filas { get; set; } = new();
    }

    public class VMFinanzasControlFila
    {
        public int Anio { get; set; }
        public int Mes { get; set; }
        public string MesNombre { get; set; } = "";
        public decimal IngEfectivo { get; set; }
        public decimal EgrEfectivo { get; set; }
        public decimal IngBanco { get; set; }
        public decimal EgrBanco { get; set; }
        public decimal Gastos { get; set; }
        public decimal Ingresos { get; set; }
        public decimal Egresos { get; set; }
        public decimal Neto { get; set; }
        public decimal Saldo { get; set; }
    }
}
