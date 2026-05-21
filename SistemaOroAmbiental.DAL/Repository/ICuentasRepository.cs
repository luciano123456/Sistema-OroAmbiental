using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ICuentasRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Cuenta model);
        Task<bool> Insertar(Cuenta model);
        Task<Cuenta?> Obtener(int id);
        Task<IQueryable<Cuenta>> ObtenerTodos();
    }
}
