namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class GrillaServerRequest
    {
        public int Draw { get; set; }
        public int Start { get; set; }
        public int Length { get; set; } = 25;
        public string? Search { get; set; }
        public string? SortColumn { get; set; }
        public bool SortDesc { get; set; }
        /// <summary>activos | inactivos | todos</summary>
        public string? ActivoModo { get; set; }
        public Dictionary<string, string>? Filters { get; set; }
    }

    public class GrillaServerResponse<T>
    {
        public int Draw { get; set; }
        public int RecordsTotal { get; set; }
        public int RecordsFiltered { get; set; }
        public List<T> Data { get; set; } = new();
    }

    public class GrillaPaginaDeIdResponse
    {
        public int Page { get; set; }
        public int Start { get; set; }
    }
}
