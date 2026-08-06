using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ITiposPagoRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(TiposPago model);
        Task<bool> Insertar(TiposPago model);
        Task<TiposPago?> Obtener(int id);
        Task<IQueryable<TiposPago>> ObtenerTodos();
    }
}
