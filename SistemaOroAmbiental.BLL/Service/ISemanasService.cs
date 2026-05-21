using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ISemanasService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Semana model);
        Task<bool> Insertar(Semana model);
        Task<Semana?> Obtener(int id);
        Task<IQueryable<Semana>> ObtenerTodos();
    }
}
