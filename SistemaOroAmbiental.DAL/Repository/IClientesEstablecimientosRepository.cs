using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEstablecimientosRepository
    {
        Task<bool> Insertar(ClientesEstablecimiento model);
        Task<bool> Actualizar(ClientesEstablecimiento model);
        Task<bool> Eliminar(int id);
        Task<ClientesEstablecimiento?> Obtener(int id);
        Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos();
        Task<ClientesEstablecimiento?> BuscarDuplicado(int? idExcluir, int idCliente, string nombre);
        Task<bool> TieneContratos(int id);
    }
}
