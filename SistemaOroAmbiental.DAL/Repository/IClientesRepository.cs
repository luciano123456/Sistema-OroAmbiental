using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesRepository
    {
        Task<bool> Insertar(Cliente model);

        Task<bool> Actualizar(Cliente model);

        Task<bool> Eliminar(int id);

        Task<Cliente?> Obtener(int id);

        Task<IQueryable<Cliente>> ObtenerTodos();

        Task<Cliente?> BuscarDuplicado(int? idExcluir, string? nombre, string? cuit);
    }
}
