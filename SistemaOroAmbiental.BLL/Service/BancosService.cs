using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class BancosService : IBancosService
    {
        private readonly IBancosRepository _repo;

        public BancosService(IBancosRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Banco model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Banco model) => _repo.Insertar(model);
        public Task<Banco?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Banco>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
