using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ITiposPagoService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(TiposPago model);
        Task<bool> Insertar(TiposPago model);
        Task<TiposPago?> Obtener(int id);
        Task<IQueryable<TiposPago>> ObtenerTodos();
    }
}
