using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Common
{
    public static class ProductosCostoHistorialHelper
    {
        public const string OrigenAlta = "ALTA";
        public const string OrigenManual = "MANUAL";
        public const string OrigenCompra = "COMPRA";
        public const string OrigenReversionCompra = "REVERSION_COMPRA";

        public static void Registrar(
            SistemaOroAmbientalContext db,
            int idProducto,
            decimal costoAnterior,
            decimal costoNuevo,
            string origen,
            DateTime fecha,
            int? idUsuario = null,
            int? idCompra = null)
        {
            if (costoAnterior == costoNuevo)
                return;

            db.ProductosCostoHistorials.Add(new ProductosCostoHistorial
            {
                IdProducto = idProducto,
                Fecha = fecha,
                CostoAnterior = costoAnterior,
                CostoNuevo = costoNuevo,
                Origen = origen,
                IdCompra = idCompra,
                IdUsuario = idUsuario
            });
        }
    }
}
