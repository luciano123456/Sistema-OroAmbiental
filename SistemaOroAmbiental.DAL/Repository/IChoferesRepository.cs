using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IChoferesRepository
    {
        Task<bool> Insertar(Chofer model);

        Task<bool> Actualizar(Chofer model);

        Task<bool> Eliminar(int id);

        Task<Chofer?> Obtener(int id);

        Task<IQueryable<Chofer>> ObtenerTodos(bool soloActivos = false);

        Task<bool> CambiarActivo(int id, bool activo);
    }
}
