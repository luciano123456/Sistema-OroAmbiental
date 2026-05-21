using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ProvinciasService : IProvinciasService
    {
        private readonly IProvinciasRepository _repo;

        public ProvinciasService(IProvinciasRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(Provincia model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Provincia model) => _repo.Insertar(model);
        public Task<Provincia?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Provincia>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
