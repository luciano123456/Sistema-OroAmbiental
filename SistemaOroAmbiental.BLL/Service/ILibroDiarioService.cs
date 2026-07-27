using SistemaOroAmbiental.BLL.Common;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Service
{
    public interface ILibroDiarioService
    {
        Task<List<LibroDiarioConcepto>> ListarConceptos(bool soloActivos);
        Task<List<LibroDiarioMovimientoDto>> ListarMovimientos(LibroDiarioFiltroDto filtro);
        Task<(LibroDiarioResumenDto resumen, decimal saldoAnterior)> ObtenerResumen(LibroDiarioFiltroDto filtro);
        Task<LibroDiarioMovimientoDto?> ObtenerMovimiento(int id);
        Task<ServiceResult> InsertarMovimiento(LibroDiarioMovimientoDto dto, int idUsuario);
        Task<ServiceResult> ActualizarMovimiento(LibroDiarioMovimientoDto dto, int idUsuario);
        Task<ServiceResult> EliminarMovimiento(int id);
        Task<List<(int Id, string Nombre)>> AutocompleteClientes(string? buscar);
        Task<List<(int Id, string Nombre)>> AutocompleteProveedores(string? buscar);
    }
}
