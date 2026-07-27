using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IProveedoresContactosService
    {
        Task<List<ProveedoresContacto>> ObtenerPorProveedor(int idProveedor);
        Task<ProveedoresContacto?> Obtener(int id);
        Task<ServiceResult> Insertar(ProveedoresContacto model);
        Task<ServiceResult> Actualizar(ProveedoresContacto model);
        Task<ServiceResult> Eliminar(int id);
    }
}
