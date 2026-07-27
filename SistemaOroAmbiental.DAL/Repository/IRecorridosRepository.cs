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

        Task<bool> InsertarClientesRecorrido(ClientesRecorrido model);

        Task<bool> ActualizarClientesRecorrido(ClientesRecorrido model);

        Task<bool> EliminarClientesRecorrido(int id);

        Task<ClientesRecorrido?> ObtenerClientesRecorrido(int id);

        Task<HojaRutaDto?> ObtenerHojaRuta(int idCamion, IReadOnlyList<(int IdSemana, int IdDia)> recorridos, DateTime fecha);

        Task<List<RecorridoSugeridoDto>> ListarSugeridosPorRecoleccion(int idCamion, int idSemana, int idDia);

        Task<(int Insertados, string Error)> InsertarClientesRecorridoBulk(
            int idCamion,
            int idSemana,
            int idDia,
            int idUsuario,
            IReadOnlyList<(int IdCliente, int? IdEstablecimiento)> items);
    }
}
