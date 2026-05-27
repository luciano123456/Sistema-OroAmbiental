using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Common
{
    public class ServiceResult
    {
        public bool Ok { get; set; }
        public string Mensaje { get; set; } = "";
        public string Tipo { get; set; } = "info";
        public int? IdReferencia { get; set; }
        public DependenciasEliminacionInfo? Dependencias { get; set; }
        public string? InstruccionesPasoAPaso { get; set; }

        public static ServiceResult Success(string mensaje = "")
            => new() { Ok = true, Mensaje = mensaje, Tipo = "success" };

        public static ServiceResult Error(
            string mensaje,
            string tipo = "error",
            int? idReferencia = null)
            => new()
            {
                Ok = false,
                Mensaje = mensaje,
                Tipo = tipo,
                IdReferencia = idReferencia
            };
    }
}