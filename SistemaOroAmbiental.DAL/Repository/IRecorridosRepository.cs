using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IRecorridosRepository
    {
        Task<List<RecorridosMatrizDto>> ObtenerMatriz(int? idCamion);

        Task<(bool Ok, string Error)> GuardarCeldaMatriz(RecorridosMatriz model);

        Task<List<ClientesRecorridoDto>> ListarClientesPorRecorrido(int idCamion, int idSemana, int idDia);

        Task<List<ClientesRecorridoDto>> BuscarClientesRecorrido(string texto, int? idCamion, int? idSemana, int? idDia);

        Task<List<ClientesRecorridoDto>> ListarPorCliente(int idCliente);

        Task<bool> InsertarClientesRecorrido(ClientesRecorrido model, bool desplazarSiOcupada = true);

        Task<bool> ActualizarClientesRecorrido(ClientesRecorrido model, bool desplazarSiOcupada = true);

        Task<bool> EliminarClientesRecorrido(int id);

        Task<ClientesRecorrido?> ObtenerClientesRecorrido(int id);

        Task<HojaRutaDto?> ObtenerHojaRuta(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            DateTime fecha,
            IReadOnlyCollection<int>? idsRecorridoExcluir = null);

        Task<int> ObtenerSiguienteNumeroManifiesto(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos);

        Task<(bool Ok, string Error)> RegistrarUltimoNumeroManifiesto(
            int idCamion,
            IReadOnlyList<(int IdSemana, int IdDia)> recorridos,
            int ultimoNumero,
            int idUsuario);

        Task<GuardarHistorialManifiestoResultDto> GuardarHistorialManifiestos(
            int idCamion,
            ManifiestosHojaDto model,
            string nombre,
            int idUsuario);

        Task<ManifiestosCamionDto> ListarManifiestosPorCamion(int idCamion);

        Task<ManifiestosHojaDto?> ObtenerManifiestosHistorial(int idCamion, IReadOnlyList<int> ids);

        Task<List<RecorridoOpcionManifiestoDto>> ListarRutasManifiestoCamion(int idCamion);

        Task<int> ObtenerSiguienteNumeroManifiestoCamion(int idCamion);

        Task<(bool Ok, string Error)> EliminarManifiestoHistorial(int idCamion, int id);

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

        Task<(int Insertados, string Error)> InsertarClientesRecorridoBulk(
            int idCamion,
            int idSemana,
            int idDia,
            int idUsuario,
            IReadOnlyList<(int IdCliente, int? IdEstablecimiento)> items);

        /// <summary>
        /// Sincroniza ClientesRecorridos con la programación del establecimiento
        /// (día/semana/unidad y OrdenRecorrido = número de recorrido).
        /// </summary>
        Task<(bool Ok, string Error)> SyncEstablecimientoEnRecorridos(int idEstablecimiento, int idUsuario);

        Task EliminarPorEstablecimiento(int idEstablecimiento);

        Task EliminarPorCliente(int idCliente);
    }
}
