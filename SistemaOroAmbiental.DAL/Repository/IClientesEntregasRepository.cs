using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEntregasRepository
    {
        Task<List<ClientesEntrega>> ListarFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idCliente,
            int? idContrato,
            int? idEstado,
            string? texto);

        Task<ClientesEntrega?> Obtener(int id);

        Task<int> Insertar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<ClientesEntregasProductosRecuperado> lineasRecuperadas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario);

        Task<bool> Actualizar(
            ClientesEntrega entrega,
            List<ClientesEntregasProducto> lineas,
            List<ClientesEntregasProductosRecuperado> lineasRecuperadas,
            List<EntregaCobroRegistrar> cobros,
            int idUsuario);

        Task<bool> Eliminar(int id);

        Task<(decimal importeTotal, List<ClientesCobro> cobros, Dictionary<int, int> movimientosCcPorCobro)> ObtenerCobrosEntrega(int idEntrega);

        Task<Dictionary<int, decimal>> SumarCobrosPorEntregas(IReadOnlyList<int> idsEntrega);
    }
}
