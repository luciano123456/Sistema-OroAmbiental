using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ClientesProfesionesService : IClientesProfesionesService
    {
        private readonly IClientesProfesionesRepository _repo;

        public ClientesProfesionesService(IClientesProfesionesRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(ClientesProfesion model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(ClientesProfesion model) => _repo.Insertar(model);
        public Task<ClientesProfesion?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<ClientesProfesion>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
