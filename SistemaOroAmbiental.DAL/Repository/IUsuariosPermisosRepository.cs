using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IUsuariosPermisosRepository
    {
        Task<List<UsuariosModulo>> ObtenerModulosActivos();

        Task<List<UsuariosPermiso>> ObtenerPermisosActivos();

        Task<List<UsuariosPermisosUsuario>> ObtenerPermisosUsuario(int idUsuario);

        Task<UsuariosPermisosUsuario?> ObtenerPermisoUsuario(
            int idUsuario,
            int idModulo,
            int idPermiso);

        Task<List<UsuariosPermisosUsuario>> ObtenerPermisosUsuarioPorModulos(
            int idUsuario,
            List<int> idsModulos);

        Task<List<UsuariosRolesPermiso>> ObtenerPermisosRolActivo(int idRol);

        Task RegistrarPermisoUsuario(UsuariosPermisosUsuario entity);

        Task RegistrarPermisosUsuario(List<UsuariosPermisosUsuario> entities);

        void ActualizarPermisoUsuario(UsuariosPermisosUsuario entity);

        Task<bool> SaveChanges();
    }
}