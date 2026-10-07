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
                    Entidad = Truncar(HumanizarEntidad(entidad), 120) ?? "",
                    IdEntidad = idEntidad,
                    NombreEntidad = Truncar(nombreEntidad, 250),
                    Tipo = Truncar(NormalizarTipo(tipo), 20) ?? EliminacionLog.TipoSimple,
                    Detalle = detalle,
                    Ip = Truncar(NormalizarIp(actor?.Ip), 64)
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

        public static string NormalizarTipo(string? tipo)
        {
            var t = (tipo ?? "").Trim().ToLowerInvariant();
            if (t is EliminacionLog.TipoDesvincular || t.Contains("desvincular"))
                return EliminacionLog.TipoDesvincular;
            if (t is EliminacionLog.TipoCascada || t.Contains("borrar asociados") || t.Contains("cascada"))
                return EliminacionLog.TipoCascada;
            return EliminacionLog.TipoSimple;
        }

        public static string HumanizarEntidad(string? entidad)
        {
            var raw = (entidad ?? "").Trim();
            if (raw.Length == 0)
                return raw;

            return raw.ToLowerInvariant() switch
            {
                "el producto" => "Producto",
                "el producto del establecimiento" => "Producto de establecimiento",
                "el cliente" => "Cliente",
                "el contrato" => "Contrato",
                "el establecimiento" => "Establecimiento",
                "el proveedor" => "Proveedor",
                "el chofer" => "Chofer",
                "el gasto" => "Gasto",
                "la compra" => "Compra",
                "la entrega" => "Entrega",
                "el usuario" => "Usuario",
                "la firma" => "Firma",
                "la sucursal" => "Sucursal",
                _ => char.ToUpperInvariant(raw[0]) + raw[1..]
            };
        }

        public static string? NormalizarIp(string? ip)
        {
            if (string.IsNullOrWhiteSpace(ip))
                return ip;

            var v = ip.Trim().Trim('[', ']');
            if (v.StartsWith("::ffff:", StringComparison.OrdinalIgnoreCase))
                v = v[7..];

            if (v is "::1" or ":1" or "0:0:0:0:0:0:0:1" or "127.0.0.1" or "localhost")
                return "localhost";

            return v;
        }

        public static string? NombreUsuario(string? nombre, string? apellido, string? usuario)
        {
            var full = $"{nombre} {apellido}".Trim();
            if (!string.IsNullOrWhiteSpace(full))
                return full;
            return string.IsNullOrWhiteSpace(usuario) ? null : usuario.Trim();
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
