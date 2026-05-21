using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ISucursalesRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Sucursal model);
        Task<bool> Insertar(Sucursal model);
        Task<Sucursal?> Obtener(int id);
        Task<IQueryable<Sucursal>> ObtenerTodos();
    }
}
