using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface IClientesEstablecimientosTercerosRepository
    {
        Task<List<ClientesEstablecimientosTercero>> ObtenerPorEstablecimiento(int idEstablecimiento, bool soloActivos = false);
        Task<List<ClientesEstablecimientosTercero>> ObtenerPorCliente(int idCliente, bool soloActivos = false);
        Task<ClientesEstablecimientosTercero?> Obtener(int id);
        Task<ClientesEstablecimientosTercero?> BuscarDuplicado(int? idExcluir, int idEstablecimiento, string nombre);
        Task<int> ContarCobros(int idTercero);
        Task<List<TerceroPagoAnalisisItem>> AnalisisPorEstablecimiento(int idEstablecimiento);
        Task<bool> Insertar(ClientesEstablecimientosTercero model);
        Task<bool> Actualizar(ClientesEstablecimientosTercero model);
        Task<bool> Eliminar(int id);
    }
}
