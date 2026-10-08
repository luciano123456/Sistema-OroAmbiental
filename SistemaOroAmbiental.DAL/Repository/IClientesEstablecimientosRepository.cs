using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEstablecimientosRepository
    {
        Task<bool> Insertar(ClientesEstablecimiento model);
        Task<bool> Actualizar(ClientesEstablecimiento model);
        Task<bool> Eliminar(int id);

        Task<bool> EliminarSinTransaccion(int id);
        Task<ClientesEstablecimiento?> Obtener(int id);
        Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos();
        Task<List<ClientesEstablecimiento>> ListarPorCliente(int idCliente);
        Task<GrillaPaginadaResult<ClientesEstablecimiento>> ListarPaginado(GrillaPaginadaConsulta consulta);
        Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta);
        Task<ClientesEstablecimiento?> BuscarDuplicado(int? idExcluir, string? idEstablecimientoCliente);
        Task<bool> TieneContratos(int id);
        Task<ClientesEstablecimiento?> ObtenerPrincipalPorCliente(int idCliente);
        Task<Dictionary<int, List<VisitaRecorridoTexto>>> ListarVisitas(IReadOnlyCollection<int> idsEstablecimiento);
        Task<List<ClientesEstablecimientosDia>> ObtenerDiasAdicionales(int idEstablecimiento);
        Task<bool> ReemplazarDiasAdicionales(int idEstablecimiento, IReadOnlyList<ClientesEstablecimientosDia> dias, int idUsuario);
        Task<int> ObtenerPrimerIdCatalogo(string tabla);
        Task<OrdenRecorridoOcupanteDto> ObtenerOcupanteOrdenRecorrido(
            int idCamion, int idDia, int idSemana, int orden, int? idExcluirEstablecimiento);
        Task DesplazarOrdenRecorridoSiOcupado(
            int idCamion, int idDia, int idSemana, int orden, int? idExcluirEstablecimiento);
    }
}
