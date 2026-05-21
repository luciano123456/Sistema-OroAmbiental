using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IBancosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Banco model);
        Task<bool> Insertar(Banco model);
        Task<Banco?> Obtener(int id);
        Task<IQueryable<Banco>> ObtenerTodos();
    }
}
