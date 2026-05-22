using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class EntregaCobrosResumen
    {
        public int IdEntrega { get; set; }
        public decimal ImporteTotal { get; set; }
        public decimal TotalCobrado { get; set; }
        public decimal SaldoPendiente { get; set; }
        public bool TieneCobros { get; set; }
        public List<EntregaCobroItem> Cobros { get; set; } = new();
    }

    public class EntregaCobroItem
    {
        public int IdCobro { get; set; }
        public int IdMovimientoCc { get; set; }
        public int IdCuenta { get; set; }
        public int IdSucursal { get; set; }
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = "";
        public decimal Importe { get; set; }
        public string Cuenta { get; set; } = "";
        public string Sucursal { get; set; } = "";
        public string? Usuario { get; set; }
    }

    public interface IClientesEntregasService
    {
        Task<List<ClientesEntrega>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCliente,
            int? idContrato,
            int? idEstado,
            string? texto);

        Task<ClientesEntrega?> Obtener(int id);

        Task<Dictionary<int, decimal>> SumarCobrosPorEntregas(IEnumerable<int> idsEntrega);

        Task<ServiceResult> Insertar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario);

        Task<ServiceResult> Actualizar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario);

        Task<ServiceResult> Eliminar(int id);

        Task<EntregaCobrosResumen?> ObtenerCobros(int idEntrega);
    }
}
