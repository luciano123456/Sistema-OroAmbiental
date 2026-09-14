namespace SistemaOroAmbiental.Models
{
    public class GrillaPaginadaConsulta
    {
        public int Start { get; set; }
        public int Length { get; set; } = 25;
        public string? Search { get; set; }
        public string? SortColumn { get; set; }
        public bool SortDesc { get; set; }
        /// <summary>activos | inactivos | todos</summary>
        public string? ActivoModo { get; set; }
        public Dictionary<string, string>? Filters { get; set; }
    }

    public class GrillaPaginadaResult<T>
    {
        public int Total { get; set; }
        public int Filtered { get; set; }
        public List<T> Items { get; set; } = new();
    }
}
