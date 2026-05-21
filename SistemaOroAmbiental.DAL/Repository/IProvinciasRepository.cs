using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProvinciasRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Provincia model);
        Task<bool> Insertar(Provincia model);
        Task<Provincia?> Obtener(int id);
        Task<IQueryable<Provincia>> ObtenerTodos();
    }
}
