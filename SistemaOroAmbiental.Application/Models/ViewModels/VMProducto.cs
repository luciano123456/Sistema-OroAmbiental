namespace SistemaOroAmbiental.Application.Models.ViewModels
{
    public class VMProducto
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = "";

        public string? Abreviatura { get; set; }

        public bool EsDescartadorChicoHojaRuta { get; set; }

        public bool EsDescartadorGrandeHojaRuta { get; set; }

        /// <summary>
        /// Si otro producto ya tiene el mismo rol de descartador en hoja de ruta,
        /// permite reemplazarlo por este.
        /// </summary>
        public bool ReemplazarDescartadorHojaRuta { get; set; }

        public int IdCategoria { get; set; }

        public int IdMedida { get; set; }

        public decimal CostoUnitario { get; set; }

        public int StockMinimo { get; set; }

        /// <summary>Stock sumado en todas las sucursales (tabla Inventario).</summary>
        public decimal StockTotal { get; set; }

        /// <summary>sin_stock | bajo | ok | normal</summary>
        public string StockEstadoCodigo { get; set; } = "sin_stock";

        public string StockEstadoTexto { get; set; } = "Sin stock";

        public string? Categoria { get; set; }

        public string? Medida { get; set; }

        public int IdUsuarioRegistra { get; set; }

        public DateTime FechaUsuarioRegistra { get; set; }

        public string? UsuarioRegistra { get; set; }

        public int? IdUsuarioModifica { get; set; }

        public DateTime? FechaUsuarioModifica { get; set; }

        public string? UsuarioModifica { get; set; }

        public bool Activo { get; set; } = true;
    }
}
