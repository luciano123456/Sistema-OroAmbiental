using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IRecorridosService
    {
        Task<List<RecorridosMatrizDto>> ObtenerMatriz(int? idCamion);

        Task<ServiceResult> GuardarCeldaMatriz(RecorridosMatriz model);

        Task<List<ClientesRecorridoDto>> ListarClientesPorRecorrido(int idCamion, int idSemana, int idDia);

        Task<List<ClientesRecorridoDto>> BuscarClientesRecorrido(string texto, int? idCamion, int? idSemana, int? idDia);

        Task<List<ClientesRecorridoDto>> ListarPorCliente(int idCliente);

        Task<ServiceResult> InsertarClientesRecorrido(ClientesRecorrido model);

        Task<ServiceResult> ActualizarClientesRecorrido(ClientesRecorrido model);

        Task<ServiceResult> EliminarClientesRecorrido(int id);

        Task<ClientesRecorrido?> ObtenerClientesRecorrido(int id);

        Task<HojaRutaDto?> ObtenerHojaRuta(int idCamion, IReadOnlyList<(int IdSemana, int IdDia)> recorridos, DateTime fecha);

        Task<List<RecorridoSugeridoDto>> ListarSugeridosPorRecoleccion(int idCamion, int idSemana, int idDia);

        Task<ServiceResult> InsertarClientesRecorridoBulk(
            int idCamion,
            int idSemana,
            int idDia,
            int idUsuario,
            IReadOnlyList<(int IdCliente, int? IdEstablecimiento)> items);
    }
}
