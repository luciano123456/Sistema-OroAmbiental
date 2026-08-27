using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesCertificadosTratamientoRepository
    {
        Task<SiguienteNumeroCertificadoDto> ObtenerSiguienteNumero(int ultimoCertificadoUsado, int ultimoOrdenUsado);

        Task<List<ClientesCertificadoTratamiento>> ListarPorCliente(int idCliente);

        Task<ClientesCertificadoTratamiento?> Obtener(int id);

        Task<List<ClientesCertificadoTratamiento>> InsertarLote(IReadOnlyList<ClientesCertificadoTratamiento> items);

        Task<bool> Eliminar(int id);

        Task ActualizarContador(int ultimoCertificado, int ultimoOrden, int idUsuario);

        Task<List<ClienteDocumentoManifiestoDto>> ListarDocumentosPorCliente(int idCliente);
    }
}
