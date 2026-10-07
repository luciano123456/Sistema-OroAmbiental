using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IFirmasRepository
    {
        Task<bool> Insertar(Firma model);

        Task<bool> Actualizar(Firma model);

        Task<bool> Eliminar(int id);

        Task<Firma?> Obtener(int id);

        Task<IQueryable<Firma>> ObtenerTodos(bool soloActivos = false);

        Task<bool> CambiarActivo(int id, bool activo);
    }
}
