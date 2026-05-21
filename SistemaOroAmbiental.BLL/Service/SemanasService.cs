using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class SemanasService : ISemanasService
    {
        private readonly ISemanasRepository _repo;

        public SemanasService(ISemanasRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Semana model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Semana model) => _repo.Insertar(model);
        public Task<Semana?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Semana>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
