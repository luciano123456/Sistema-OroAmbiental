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

        Task<ServiceResult> InsertarClientesRecorrido(ClientesRecorrido model, bool desplazarSiOcupada = true);

        Task<ServiceResult> ActualizarClientesRecorrido(ClientesRecorrido model, bool desplazarSiOcupada = true);

        Task<ServiceResult> EliminarClientesRecorrido(int id);

        Task<ClientesRecorrido?> ObtenerClientesRecorrido(int id);

        Task<HojaRutaDto?> ObtenerHojaRuta(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            DateTime fecha,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null);

        Task<int> ObtenerSiguienteNumeroManifiesto(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos);

        Task<ServiceResult> RegistrarUltimoNumeroManifiesto(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            int ultimoNumero,
            int idUsuario);

        Task GuardarHistorialManifiestos(
            int idCamion,
            ManifiestosHojaDto model,
            string nombre,
            int idUsuario);

        Task<ManifiestosCamionDto> ListarManifiestosPorCamion(int idCamion);

        Task<ManifiestosHojaDto?> ObtenerManifiestosHistorial(int idCamion, IReadOnlyList<int> ids);

        Task<List<RecorridoOpcionManifiestoDto>> ListarRutasManifiestoCamion(int idCamion);

        Task<int> ObtenerSiguienteNumeroManifiestoCamion(int idCamion);

        Task<ServiceResult> EliminarManifiestoHistorial(int idCamion, int id);

        Task<ManifiestosHojaDto?> ObtenerManifiestos(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            int numeroInicial,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null,
            int? idRecorrido = null);

        Task<ArchivoIntercambioDto?> ObtenerArchivoIntercambio(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            DateTime fecha,
            int numeroInicial,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null,
            int? idRecorrido = null,
            string? nombre = null,
            bool mesCompleto = false,
            IReadOnlyCollection<int>? idsRecorridoIncluir = null);

        Task<List<RecorridoSugeridoDto>> ListarSugeridosPorRecoleccion(int idCamion, int idSemana, int idDia);

        Task<ServiceResult> InsertarClientesRecorridoBulk(
            int idCamion,
            int idSemana,
            int idDia,
            int idUsuario,
            IReadOnlyList<(int IdCliente, int? IdEstablecimiento)> items);

        Task<ServiceResult> SyncEstablecimientoEnRecorridos(int idEstablecimiento, int idUsuario);
    }
}
