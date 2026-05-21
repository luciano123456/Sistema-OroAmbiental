using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IDiasRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Dia model);
        Task<bool> Insertar(Dia model);
        Task<Dia?> Obtener(int id);
        Task<IQueryable<Dia>> ObtenerTodos();
    }
}
