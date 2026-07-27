using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ILocalidadesService
    {
        Task<bool> Actualizar(Localidad model);
        Task<bool> Insertar(Localidad model);
        Task<ServiceResult> Eliminar(int id);
        Task<Localidad?> Obtener(int id);
        Task<IQueryable<Localidad>> ObtenerTodos();
        Task<IQueryable<Localidad>> ObtenerPorProvincia(int idProvincia);
        Task<IQueryable<Localidad>> ObtenerPorPartido(int idPartido);
    }
}
