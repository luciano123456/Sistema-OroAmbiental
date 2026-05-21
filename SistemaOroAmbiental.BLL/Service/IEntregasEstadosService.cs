using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IEntregasEstadosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(EntregasEstado model);
        Task<bool> Insertar(EntregasEstado model);
        Task<EntregasEstado?> Obtener(int id);
        Task<IQueryable<EntregasEstado>> ObtenerTodos();
    }
}
