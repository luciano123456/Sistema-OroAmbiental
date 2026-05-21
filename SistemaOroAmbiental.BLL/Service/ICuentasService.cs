using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ICuentasService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Cuenta model);
        Task<bool> Insertar(Cuenta model);
        Task<Cuenta?> Obtener(int id);
        Task<IQueryable<Cuenta>> ObtenerTodos();
    }
}
