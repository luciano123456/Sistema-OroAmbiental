using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public class UsuariosService : IUsuariosService
    {

        private readonly IUsuariosRepository<User> _contactRepo;
        private readonly IEntidadCascadeRepository _cascadeRepo;

        public UsuariosService(IUsuariosRepository<User> contactRepo, IEntidadCascadeRepository cascadeRepo)
        {
            _contactRepo = contactRepo;
            _cascadeRepo = cascadeRepo;
        }
        public async Task<bool> Actualizar(User model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id)
            => _cascadeRepo.ObtenerDependenciasUsuarioAsync(id);

        public Task<ServiceResult> Eliminar(int id, bool cascada = false)
            => DeleteOperationHelper.ExecuteCascadeAsync(
                id,
                cascada,
                "el usuario",
                () => _cascadeRepo.ObtenerDependenciasUsuarioAsync(id),
                () => _cascadeRepo.EliminarUsuarioEnCascadaAsync(id),
                () => DeleteOperationHelper.ExecuteAsync(
                    () => _contactRepo.Eliminar(id),
                    "el usuario",
                    "Usuario eliminado correctamente",
                    id),
                "Usuario eliminado. Se desvinculó la auditoría; no se borraron datos de negocio.",
                "Error inesperado al eliminar el usuario en cascada.");

        public async Task<bool> Insertar(User model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<User> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }

        public async Task<User> ObtenerUsuario(string usuario)
        {
            return await _contactRepo.ObtenerUsuario(usuario);
        }


        public Task<IQueryable<User>> ObtenerTodos(bool soloActivos = false)
            => _contactRepo.ObtenerTodos(soloActivos);

        public Task<GrillaPaginadaResult<User>> ListarPaginado(GrillaPaginadaConsulta consulta)
            => _contactRepo.ListarPaginado(consulta);

        public Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta)
            => _contactRepo.ObtenerIndiceEnLista(id, consulta);

        public Task<bool> CambiarActivo(int id, bool activo)
            => _contactRepo.CambiarActivo(id, activo);
    }
}
