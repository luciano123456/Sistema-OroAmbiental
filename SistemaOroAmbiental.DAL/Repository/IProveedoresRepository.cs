using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProveedoresRepository
    {
        Task<bool> Insertar(Proveedore model);

        Task<bool> Actualizar(Proveedore model);

        Task<bool> Eliminar(int id);

        Task<Proveedore?> Obtener(int id);

        Task<IQueryable<Proveedore>> ObtenerTodos();

        Task<Proveedore?> BuscarDuplicado(int? idExcluir, string? nombre, string? cuit);
    }
}
