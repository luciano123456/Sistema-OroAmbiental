using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ISucursalesService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Sucursal model);
        Task<bool> Insertar(Sucursal model);
        Task<Sucursal?> Obtener(int id);
        Task<IQueryable<Sucursal>> ObtenerTodos();
    }
}
