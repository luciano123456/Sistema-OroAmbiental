using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class UsuariosSucursalesService : IUsuariosSucursalesService
    {
        private readonly IUsuariosSucursalesRepository _repo;

        public UsuariosSucursalesService(IUsuariosSucursalesRepository repo)
        {
            _repo = repo;
        }

        public Task<List<int>> ObtenerIdsSucursales(int idUsuario)
            => _repo.ObtenerIdsSucursales(idUsuario);

        public Task<List<SucursalListaItem>> ListaAsignadas(int idUsuario)
            => _repo.ListaAsignadas(idUsuario);

        public Task<List<SucursalListaItem>> ListaParaUsuario(int idUsuario)
            => _repo.ListaParaUsuario(idUsuario);

        public Task<bool> ActualizarMasivo(int idUsuario, IEnumerable<int> idsSucursales)
            => _repo.ActualizarMasivo(idUsuario, idsSucursales);
    }
}
