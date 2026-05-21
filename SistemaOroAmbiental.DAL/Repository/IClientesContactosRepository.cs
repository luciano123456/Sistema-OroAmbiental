using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesContactosRepository
    {
        Task<List<ClientesContacto>> ObtenerPorCliente(int idCliente);

        Task<ClientesContacto?> Obtener(int id);

        Task<ClientesContacto?> BuscarDuplicado(int? idExcluir, int idCliente, string nombre);

        Task<bool> Insertar(ClientesContacto model);

        Task<bool> Actualizar(ClientesContacto model);

        Task<bool> Eliminar(int id);
    }
}
