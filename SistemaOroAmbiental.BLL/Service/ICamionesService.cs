using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ICamionesService
    {
        Task<ServiceResult> Insertar(Camion model);

        Task<ServiceResult> Actualizar(Camion model);

        Task<ServiceResult> Eliminar(int id);

        Task<Camion?> Obtener(int id);

        Task<IQueryable<Camion>> ObtenerTodos(bool soloActivos = false);

        Task<ServiceResult> CambiarActivo(int id, bool activo);
    }
}
