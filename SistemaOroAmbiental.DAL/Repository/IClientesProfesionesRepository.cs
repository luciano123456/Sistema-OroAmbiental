using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesProfesionesRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ClientesProfesion model);
        Task<bool> Insertar(ClientesProfesion model);
        Task<ClientesProfesion?> Obtener(int id);
        Task<IQueryable<ClientesProfesion>> ObtenerTodos();
    }
}
