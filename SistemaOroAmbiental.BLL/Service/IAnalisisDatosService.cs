using SistemaOroAmbiental.Models.Analisis;

namespace SistemaOroAmbiental.BLL.Service;

public interface IAnalisisDatosService
{
    Task<AnalisisClientesResumen> ObtenerReporteClientes(AnalisisFiltro filtro);
    Task<AnalisisOperacionesResumen> ObtenerReporteOperaciones(AnalisisFiltro filtro);
    Task<AnalisisFinanzasResumen> ObtenerReporteFinanzas(AnalisisFiltro filtro);
    Task<AnalisisInventarioResumen> ObtenerReporteInventario(AnalisisFiltro filtro);
    Task<AnalisisRecorridosResumen> ObtenerReporteRecorridos(AnalisisFiltro filtro);
}
