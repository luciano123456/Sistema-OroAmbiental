using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository
{
    public interface ILibroDiarioRepository
    {
        Task<List<LibroDiarioConcepto>> ListarConceptos(bool soloActivos);
        Task<List<LibroDiarioMovimientoDto>> ListarMovimientos(LibroDiarioFiltroDto filtro);
        Task<LibroDiarioResumenDto> ObtenerResumen(LibroDiarioFiltroDto filtro);
        Task<decimal> SaldoAnterior(LibroDiarioFiltroDto filtro);
        Task<LibroDiarioMovimiento?> ObtenerMovimiento(int id);
        Task<int> InsertarMovimiento(LibroDiarioMovimiento movimiento);
        Task<bool> ActualizarMovimiento(LibroDiarioMovimiento movimiento);
        Task<bool> EliminarMovimiento(int id);
        Task<List<(int Id, string Nombre)>> AutocompleteClientes(string? buscar);
        Task<List<(int Id, string Nombre)>> AutocompleteProveedores(string? buscar);
    }
}
