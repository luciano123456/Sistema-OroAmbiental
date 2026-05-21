using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IUnidadesMedidaRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UnidadesMedida model);
        Task<bool> Insertar(UnidadesMedida model);
        Task<UnidadesMedida?> Obtener(int id);
        Task<IQueryable<UnidadesMedida>> ObtenerTodos();
    }
}
