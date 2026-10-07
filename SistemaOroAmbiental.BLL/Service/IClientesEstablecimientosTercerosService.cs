using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface IClientesEstablecimientosTercerosService
    {
        Task<List<ClientesEstablecimientosTercero>> ObtenerPorEstablecimiento(int idEstablecimiento, bool soloActivos = false);
        Task<List<ClientesEstablecimientosTercero>> ObtenerPorCliente(int idCliente, bool soloActivos = false);
        Task<List<TerceroPagoAnalisisItem>> AnalisisPorEstablecimiento(int idEstablecimiento);
        Task<ServiceResult> Insertar(ClientesEstablecimientosTercero model);
        Task<ServiceResult> Actualizar(ClientesEstablecimientosTercero model);
        Task<ServiceResult> Eliminar(int id);
    }
}
