using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Common
{
    public class EliminacionLogActor
    {
        public int? IdUsuario { get; set; }
        public string? UsuarioNombre { get; set; }
        public string? Ip { get; set; }
    }

    /// <summary>
    /// Usuario y repositorio del request actual (AsyncLocal).
    /// Permite registrar logs desde helpers estáticos y repositorios DAL.
    /// </summary>
    public static class EliminacionLogAmbient
    {
        public static readonly AsyncLocal<EliminacionLogActor?> Actor = new();
        public static readonly AsyncLocal<IEliminacionesLogRepository?> Repo = new();

        public static async Task TryRegistrarAsync(
            string entidad,
            int? idEntidad,
            string tipo,
            DependenciasEliminacionInfo? deps = null,
            string? nombreEntidad = null)
        {
            try
            {
                var repo = Repo.Value;
                if (repo == null)
                    return;

                var actor = Actor.Value;
                var detalle = FormatearDetalle(deps);

                await repo.InsertarAsync(new EliminacionLog
                {
                    Fecha = DateTime.Now,
                    IdUsuario = actor?.IdUsuario,
                    UsuarioNombre = Truncar(actor?.UsuarioNombre, 100),
                    Entidad = Truncar(entidad, 120) ?? "",
                    IdEntidad = idEntidad,
                    NombreEntidad = Truncar(nombreEntidad, 250),
                    Tipo = Truncar(tipo, 20) ?? EliminacionLog.TipoSimple,
                    Detalle = detalle,
                    Ip = Truncar(actor?.Ip, 64)
                });
            }
            catch
            {
                // Nunca revertir la eliminación por un fallo de auditoría.
            }
        }

        public static string TipoDesdeDeps(DependenciasEliminacionInfo? deps)
        {
            if (deps == null || !deps.TieneDependencias)
                return EliminacionLog.TipoSimple;

            return string.Equals(deps.TipoCascada, "desvincular", StringComparison.OrdinalIgnoreCase)
                ? EliminacionLog.TipoDesvincular
                : EliminacionLog.TipoCascada;
        }

        private static string? FormatearDetalle(DependenciasEliminacionInfo? deps)
        {
            if (deps?.Items == null || deps.Items.Count == 0)
                return null;

            var partes = deps.Items.Select(i =>
            {
                var texto = $"{i.Etiqueta}: {i.Cantidad}";
                if (!string.IsNullOrWhiteSpace(i.AccionManual))
                    texto += $" ({i.AccionManual})";
                return texto;
            });

            var detalle = string.Join("; ", partes);
            if (!string.IsNullOrWhiteSpace(deps.MensajeResumen))
                detalle = deps.MensajeResumen + " | " + detalle;

            return Truncar(detalle, 8000);
        }

        private static string? Truncar(string? valor, int max)
        {
            if (string.IsNullOrEmpty(valor))
                return valor;
            return valor.Length <= max ? valor : valor[..max];
        }
    }
}
