using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEstablecimientosProductosRepository
    {
        Task<List<ClientesEstablecimientosProducto>> ObtenerPorEstablecimiento(int idEstablecimiento);
        Task<ClientesEstablecimientosProducto?> Obtener(int id);
        Task<ClientesEstablecimientosProducto?> BuscarDuplicado(int? idExcluir, int idEstablecimiento, int idProducto);
        Task<bool> Insertar(ClientesEstablecimientosProducto model);
        Task<bool> Actualizar(ClientesEstablecimientosProducto model);
        Task<bool> Eliminar(int id);
    }
}
