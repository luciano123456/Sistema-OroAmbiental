using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesRepository
    {
        Task<bool> Insertar(Cliente model);

        Task<bool> Actualizar(Cliente model);

        Task<bool> Eliminar(int id);

        Task<Cliente?> Obtener(int id);

        Task<IQueryable<Cliente>> ObtenerTodos(bool soloActivos = false);

        Task<GrillaPaginadaResult<Cliente>> ListarPaginado(GrillaPaginadaConsulta consulta);

        Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta);

        Task<bool> CambiarActivo(int id, bool activo);

        Task<Cliente?> BuscarDuplicado(int? idExcluir, string? nombre, string? cuit);
    }
}
