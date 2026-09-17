using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesEstablecimientosService
    {
        Task<ServiceResult> Insertar(ClientesEstablecimiento model, bool desplazarOrdenRecorrido = false);
        Task<ServiceResult> Actualizar(ClientesEstablecimiento model, bool desplazarOrdenRecorrido = false);
        Task<ServiceResult> Eliminar(int id, bool cascada = false);

        Task<DependenciasEliminacionInfo> ObtenerDependenciasEliminar(int id);
        Task<ClientesEstablecimiento?> Obtener(int id);
        Task<IQueryable<ClientesEstablecimiento>> ObtenerTodos();
        Task<List<ClientesEstablecimiento>> ListarPorCliente(int idCliente);
        Task<GrillaPaginadaResult<ClientesEstablecimiento>> ListarPaginado(GrillaPaginadaConsulta consulta);
        Task<int> ObtenerIndiceEnLista(int id, GrillaPaginadaConsulta consulta);
        Task<OrdenRecorridoOcupanteDto> ObtenerOcupanteOrdenRecorrido(
            int idCamion, int idDia, int idSemana, int orden, int? idExcluirEstablecimiento);
    }
}
