using SistemaOroAmbiental.DAL.Repository;

namespace SistemaOroAmbiental.BLL.Service
{
    public class ConfiguracionNombreService<T> : IConfiguracionNombreService<T>
        where T : class
    {
        private readonly IConfiguracionNombreRepository<T> _repo;

        public ConfiguracionNombreService(IConfiguracionNombreRepository<T> repo)
        {
            _repo = repo;
        }

        public Task<bool> Insertar(T model) => _repo.Insertar(model);

        public Task<bool> Actualizar(T model) => _repo.Actualizar(model);

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);

        public Task<T?> Obtener(int id) => _repo.Obtener(id);

        public Task<IQueryable<T>> ObtenerTodos() => _repo.ObtenerTodos();

        public Task<T?> BuscarDuplicado(int? idExcluir, string? nombre)
            => _repo.BuscarDuplicado(idExcluir, nombre);
    }
}
