using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ILocalidadesRepository
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Localidad model);
        Task<bool> Insertar(Localidad model);
        Task<Localidad?> Obtener(int id);
        Task<IQueryable<Localidad>> ObtenerTodos();
        Task<IQueryable<Localidad>> ObtenerPorProvincia(int idProvincia);
        Task<IQueryable<Localidad>> ObtenerPorPartido(int idPartido);
    }
}
