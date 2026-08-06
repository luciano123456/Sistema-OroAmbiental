using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaOroAmbiental.BLL.Service;
using SistemaOroAmbiental.Models.Analisis;

namespace SistemaOroAmbiental.Application.Controllers;

[Authorize]
public class AnalisisDatosController : Controller
{
    private readonly IAnalisisDatosService _service;

    public AnalisisDatosController(IAnalisisDatosService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    public IActionResult Index() => View();

    private static List<int> ParseIds(string? ids)
    {
        if (string.IsNullOrWhiteSpace(ids)) return new List<int>();
        return ids
            .Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => int.TryParse(s.Trim(), out var n) ? n : 0)
            .Where(n => n > 0)
            .Distinct()
            .ToList();
    }

    private static AnalisisFiltro BuildFiltro(
        DateTime? fechaDesde,
        DateTime? fechaHasta,
        int idSucursal,
        int diasSinMovimiento = 90,
        int idCliente = 0,
        string? idsEstablecimientos = null)
    {
        return new AnalisisFiltro
        {
            FechaDesde = fechaDesde,
            FechaHasta = fechaHasta,
            IdSucursal = idSucursal,
            DiasSinMovimiento = diasSinMovimiento <= 0 ? 90 : diasSinMovimiento,
            IdCliente = idCliente > 0 ? idCliente : 0,
            IdsEstablecimientos = ParseIds(idsEstablecimientos)
        };
    }

    [HttpGet]
    public async Task<IActionResult> Clientes(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        int idCliente = 0,
        string? idsEstablecimientos = null)
    {
        var data = await _service.ObtenerReporteClientes(
            BuildFiltro(fechaDesde, fechaHasta, idSucursal, 90, idCliente, idsEstablecimientos));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Operaciones(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        int idCliente = 0,
        string? idsEstablecimientos = null)
    {
        var data = await _service.ObtenerReporteOperaciones(
            BuildFiltro(fechaDesde, fechaHasta, idSucursal, 90, idCliente, idsEstablecimientos));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Finanzas(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        int idCliente = 0,
        string? idsEstablecimientos = null)
    {
        var data = await _service.ObtenerReporteFinanzas(
            BuildFiltro(fechaDesde, fechaHasta, idSucursal, 90, idCliente, idsEstablecimientos));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Inventario(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        int diasSinMovimiento = 90,
        int idCliente = 0,
        string? idsEstablecimientos = null)
    {
        var data = await _service.ObtenerReporteInventario(
            BuildFiltro(fechaDesde, fechaHasta, idSucursal, diasSinMovimiento, idCliente, idsEstablecimientos));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Recorridos(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        int idCliente = 0,
        string? idsEstablecimientos = null)
    {
        var data = await _service.ObtenerReporteRecorridos(
            BuildFiltro(fechaDesde, fechaHasta, idSucursal, 90, idCliente, idsEstablecimientos));
        return Ok(data);
    }
}
