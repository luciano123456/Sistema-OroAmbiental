using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IProveedoresContactosRepository
    {
        Task<List<ProveedoresContacto>> ObtenerPorProveedor(int idProveedor);
        Task<ProveedoresContacto?> Obtener(int id);
        Task<ProveedoresContacto?> BuscarDuplicado(int? idExcluir, int idProveedor, string nombre);
        Task<bool> Insertar(ProveedoresContacto model);
        Task<bool> Actualizar(ProveedoresContacto model);
        Task<bool> Eliminar(int id);
    }
}
