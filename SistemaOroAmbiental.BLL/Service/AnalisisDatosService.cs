using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models.Analisis;

namespace SistemaOroAmbiental.BLL.Service;

public class AnalisisDatosService : IAnalisisDatosService
{
    private readonly IAnalisisDatosRepository _repo;

    public AnalisisDatosService(IAnalisisDatosRepository repo)
    {
        _repo = repo;
    }

    public Task<AnalisisClientesResumen> ObtenerReporteClientes(AnalisisFiltro filtro)
        => _repo.ObtenerReporteClientes(filtro);

    public Task<AnalisisOperacionesResumen> ObtenerReporteOperaciones(AnalisisFiltro filtro)
        => _repo.ObtenerReporteOperaciones(filtro);

    public Task<AnalisisFinanzasResumen> ObtenerReporteFinanzas(AnalisisFiltro filtro)
        => _repo.ObtenerReporteFinanzas(filtro);

    public Task<AnalisisInventarioResumen> ObtenerReporteInventario(AnalisisFiltro filtro)
        => _repo.ObtenerReporteInventario(filtro);

    public Task<AnalisisRecorridosResumen> ObtenerReporteRecorridos(AnalisisFiltro filtro)
        => _repo.ObtenerReporteRecorridos(filtro);
}
