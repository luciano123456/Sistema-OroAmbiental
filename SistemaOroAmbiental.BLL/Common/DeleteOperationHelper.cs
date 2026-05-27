using Microsoft.EntityFrameworkCore;

namespace SistemaOroAmbiental.BLL.Common
{
    public static class DeleteOperationHelper
    {
        public static async Task<ServiceResult> ExecuteAsync(
            Func<Task<bool>> delete,
            string entidad,
            string mensajeExito,
            int? idReferencia = null,
            Func<Task<string?>>? preCheck = null)
        {
            try
            {
                if (preCheck != null)
                {
                    var bloqueo = await preCheck();
                    if (!string.IsNullOrWhiteSpace(bloqueo))
                        return ServiceResult.Error(bloqueo, "relacion", idReferencia);
                }

                var ok = await delete();
                if (!ok)
                    return ServiceResult.Error($"No se encontró {entidad}.", "validacion", idReferencia);

                return ServiceResult.Success(mensajeExito);
            }
            catch (InvalidOperationException ex)
            {
                var msg = MapInvalidOperation(ex.Message, entidad)
                    ?? (!string.IsNullOrWhiteSpace(ex.Message)
                        ? ex.Message
                        : $"No se pudo eliminar {entidad} porque tiene registros relacionados.");

                return ServiceResult.Error(msg, "relacion", idReferencia);
            }
            catch (DbUpdateException ex)
            {
                var msg = MapDbUpdateMessage(ex, entidad)
                    ?? $"No se pudo eliminar {entidad} porque tiene registros relacionados.";
                return ServiceResult.Error(msg, "relacion", idReferencia);
            }
            catch (Exception)
            {
                return ServiceResult.Error($"Error inesperado al eliminar {entidad}.");
            }
        }

        private static string? MapInvalidOperation(string? code, string entidad)
        {
            if (string.IsNullOrWhiteSpace(code))
                return null;

            return code switch
            {
                "PRODUCTO_EN_USO" =>
                    "No se pudo eliminar este producto porque está asociado a compras, entregas o establecimientos.",
                "CONTRATOS" =>
                    "No se pudo eliminar este establecimiento porque tiene contratos asociados.",
                "ENTREGAS" =>
                    "No se pudo eliminar este contrato porque tiene entregas asociadas.",
                _ when code.StartsWith("No se ", StringComparison.OrdinalIgnoreCase) => code,
                _ => null
            };
        }

        public static string? MapDbUpdateMessage(DbUpdateException ex, string entidad)
            => MapDbUpdate(ex, entidad);

        private static string? MapDbUpdate(DbUpdateException ex, string entidad)
        {
            var text = ex.InnerException?.Message ?? ex.Message;
            if (!text.Contains("REFERENCE", StringComparison.OrdinalIgnoreCase)
                && !text.Contains("DELETE statement conflict", StringComparison.OrdinalIgnoreCase)
                && !text.Contains("conflicted with the", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            if (text.Contains("ProductosCostoHistorial", StringComparison.OrdinalIgnoreCase))
                return $"No se pudo eliminar {entidad}: historial de costos de productos vinculado.";

            if (text.Contains("ProveedoresPagos", StringComparison.OrdinalIgnoreCase))
                return $"No se pudo eliminar {entidad}: pagos al proveedor vinculados.";

            if (text.Contains("ProveedoresCuentaCorriente", StringComparison.OrdinalIgnoreCase))
                return $"No se pudo eliminar {entidad}: movimientos en cuenta corriente del proveedor.";

            if (text.Contains("InventarioMovimientos", StringComparison.OrdinalIgnoreCase))
                return $"No se pudo eliminar {entidad}: movimientos de inventario vinculados.";

            return $"No se pudo eliminar {entidad} porque tiene registros relacionados en el sistema.";
        }
    }
}
