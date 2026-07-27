using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ICamionesRepository
    {
        Task<bool> Insertar(Camion model);

        Task<bool> Actualizar(Camion model);

        Task<bool> Eliminar(int id);

        Task<Camion?> Obtener(int id);

        Task<IQueryable<Camion>> ObtenerTodos(bool soloActivos = false);

        Task<bool> CambiarActivo(int id, bool activo);
    }
}
