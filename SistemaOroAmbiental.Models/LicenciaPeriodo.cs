namespace SistemaOroAmbiental.Models;

public static class LicenciaPeriodo
{
    public static bool EstadoContiene(string? nombre, string patron)
        => !string.IsNullOrWhiteSpace(nombre) &&
           nombre.Contains(patron, StringComparison.OrdinalIgnoreCase);

    public static bool EstaEnRango(DateTime? desde, DateTime? hasta, string? estadoNombre, DateTime fecha)
    {
        var porEstado = EstadoContiene(estadoNombre, "Licencia");
        var d = desde?.Date;
        var h = hasta?.Date;
        var f = fecha.Date;

        if (d.HasValue && h.HasValue)
            return f >= d.Value && f <= h.Value;
        if (d.HasValue && !h.HasValue)
            return f >= d.Value;
        if (!d.HasValue && h.HasValue)
            return f <= h.Value;
        return porEstado;
    }

    public static bool ClienteEnLicencia(Cliente cliente, DateTime fecha)
    {
        var ests = cliente.ClientesEstablecimientos;
        if (ests != null && ests.Count > 0)
        {
            foreach (var e in ests)
            {
                if (EstaEnRango(e.FechaLicenciaDesde, e.FechaLicenciaHasta, e.IdEstadoNavigation?.Nombre, fecha))
                    return true;
            }

            if (ests.Any(e => e.IdEstado != null || e.FechaLicenciaDesde != null || e.FechaLicenciaHasta != null))
                return false;
        }

        return EstaEnRango(cliente.FechaLicenciaDesde, cliente.FechaLicenciaHasta, cliente.IdEstadoNavigation?.Nombre, fecha);
    }

    public static bool ClienteEsBaja(Cliente cliente)
        => EstadoContiene(cliente.IdEstadoNavigation?.Nombre, "Baja")
           || (cliente.ClientesEstablecimientos?.Any(e => EstadoContiene(e.IdEstadoNavigation?.Nombre, "Baja")) == true);

    public static bool ClienteEsSuspendido(Cliente cliente)
        => EstadoContiene(cliente.IdEstadoNavigation?.Nombre, "SUSPEND")
           || (cliente.ClientesEstablecimientos?.Any(e => EstadoContiene(e.IdEstadoNavigation?.Nombre, "SUSPEND")) == true);

    public static DateTime? FechaLicenciaHastaAlerta(Cliente cliente)
    {
        var fechas = (cliente.ClientesEstablecimientos ?? Array.Empty<ClientesEstablecimiento>())
            .Select(e => e.FechaLicenciaHasta)
            .Where(f => f.HasValue)
            .Select(f => f!.Value.Date)
            .ToList();

        if (fechas.Count > 0)
            return fechas.Min();

        return cliente.FechaLicenciaHasta?.Date;
    }

    public static ClientesEstablecimiento? EstablecimientoLicenciaDisplay(Cliente cliente, DateTime fecha)
    {
        var ests = cliente.ClientesEstablecimientos;
        if (ests == null || ests.Count == 0)
            return null;

        return ests.FirstOrDefault(e =>
                   EstaEnRango(e.FechaLicenciaDesde, e.FechaLicenciaHasta, e.IdEstadoNavigation?.Nombre, fecha))
               ?? ests.FirstOrDefault(e =>
                   e.IdEstado != null || e.FechaLicenciaDesde != null || e.FechaLicenciaHasta != null);
    }
}
