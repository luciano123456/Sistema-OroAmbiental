using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IUsuariosPermisosService
    {
        Task<(List<UsuariosModulo> modulos, List<UsuariosPermisosUsuario> permisosUsuario, List<UsuariosPermiso> catalogo)> ObtenerFull(int idUsuario);

        Task<bool> ActualizarIndividual(
            int idUsuario,
            int idModulo,
            string codigoPermiso,
            bool activo,
            int idUsuarioEjecuta);

        Task<bool> ActualizarMasivo(
            int idUsuario,
            List<(int idModulo, string codigoPermiso, bool activo)> cambios,
            int idUsuarioEjecuta);

        Task<bool> ReemplazarTodo(
            int idUsuario,
            List<(int idModulo, string codigoPermiso)> permisosActivos,
            int idUsuarioEjecuta);

        Task<bool> CopiarDesdeRol(
            int idUsuario,
            int idRol,
            bool reemplazarExistentes,
            int idUsuarioEjecuta);
    }
}