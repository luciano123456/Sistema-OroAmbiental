using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IPartidosRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Partido model);
        Task<bool> Insertar(Partido model);
        Task<Partido?> Obtener(int id);
        Task<IQueryable<Partido>> ObtenerTodos();
        Task<IQueryable<Partido>> ObtenerPorProvincia(int idProvincia);
    }
}
