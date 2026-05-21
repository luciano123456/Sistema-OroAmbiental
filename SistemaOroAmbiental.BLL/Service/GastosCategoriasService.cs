using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class GastosCategoriasService : IGastosCategoriasService
    {
        private readonly IGastosCategoriasRepository _repo;

        public GastosCategoriasService(IGastosCategoriasRepository repo)
        {
            _repo = repo;
        }

        public Task<bool> Actualizar(GastosCategoria model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(GastosCategoria model) => _repo.Insertar(model);
        public Task<GastosCategoria?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<GastosCategoria>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
