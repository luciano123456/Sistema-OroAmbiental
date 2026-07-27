using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEstablecimientosContactosRepository
    {
        Task<List<ClientesEstablecimientosContacto>> ObtenerPorEstablecimiento(int idEstablecimiento);
        Task<ClientesEstablecimientosContacto?> Obtener(int id);
        Task<ClientesEstablecimientosContacto?> BuscarDuplicado(int? idExcluir, int idEstablecimiento, string nombre);
        Task<bool> Insertar(ClientesEstablecimientosContacto model);
        Task<bool> Actualizar(ClientesEstablecimientosContacto model);
        Task<bool> Eliminar(int id);
    }
}
