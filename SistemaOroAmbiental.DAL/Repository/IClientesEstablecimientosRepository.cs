using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEstablecimientosRepository
    {
        Task<bool> Insertar(ClientesEstablecimiento model);
        Task<bool> Actualizar(ClientesEstablecimiento model);
        Task<bool> Eliminar(int id);
        Task<ClientesEstablecimiento?> Obtener(int id);
        Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos();
        Task<ClientesEstablecimiento?> BuscarDuplicado(int? idExcluir, string? idEstablecimientoCliente);
        Task<bool> TieneContratos(int id);
        Task<ClientesEstablecimiento?> ObtenerPrincipalPorCliente(int idCliente);
        Task<List<ClientesEstablecimientosDia>> ObtenerDiasAdicionales(int idEstablecimiento);
        Task<bool> ReemplazarDiasAdicionales(int idEstablecimiento, IReadOnlyList<ClientesEstablecimientosDia> dias, int idUsuario);
        Task<int> ObtenerPrimerIdCatalogo(string tabla);
    }
}
