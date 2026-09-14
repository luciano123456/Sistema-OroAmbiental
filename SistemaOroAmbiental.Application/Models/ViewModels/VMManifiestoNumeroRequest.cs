namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMManifiestoNumeroRequest
    {
        public int IdCamion { get; set; }
        public int IdSemana { get; set; }
        public int IdDia { get; set; }
        public string? Recorridos { get; set; }
        public int UltimoNumero { get; set; }
    }
}
