using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IUsuariosSucursalesRepository
    {
        Task<List<int>> ObtenerIdsSucursales(int idUsuario);

        Task<List<SucursalListaItem>> ListaAsignadas(int idUsuario);

        Task<List<SucursalListaItem>> ListaParaUsuario(int idUsuario);

        Task<bool> ActualizarMasivo(int idUsuario, IEnumerable<int> idsSucursales);
    }
}
