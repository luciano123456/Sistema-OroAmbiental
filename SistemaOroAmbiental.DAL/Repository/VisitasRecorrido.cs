using Microsoft.EntityFrameworkCore;
using SistemaOroAmbiental.DAL.DataContext;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.DAL.Repository;

public static class VisitasRecorridoSchema
{
    public static async Task AsegurarAsync(SistemaOroAmbientalContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID('dbo.ClientesEstablecimientosDias', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ClientesEstablecimientosDias', 'IdSemana') IS NULL
        ALTER TABLE dbo.ClientesEstablecimientosDias ADD IdSemana INT NULL;
    IF COL_LENGTH('dbo.ClientesEstablecimientosDias', 'OrdenRecorrido') IS NULL
        ALTER TABLE dbo.ClientesEstablecimientosDias ADD OrdenRecorrido INT NULL;

    -- IdDia guarda el id del catálogo Dias. La FK contra la misma tabla
    -- rechazaba cualquier visita extra (Lunes/Martes no son filas de esta tabla).
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientosDias_ClientesEstablecimientosDias')
        ALTER TABLE dbo.ClientesEstablecimientosDias DROP CONSTRAINT FK_ClientesEstablecimientosDias_ClientesEstablecimientosDias;

    IF OBJECT_ID('dbo.Dias', 'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientosDias_Dias')
       AND NOT EXISTS (
            SELECT 1 FROM dbo.ClientesEstablecimientosDias d
            WHERE NOT EXISTS (SELECT 1 FROM dbo.Dias x WHERE x.Id = d.IdDia))
        ALTER TABLE dbo.ClientesEstablecimientosDias ADD CONSTRAINT FK_ClientesEstablecimientosDias_Dias
            FOREIGN KEY (IdDia) REFERENCES dbo.Dias (Id);
END
");
    }
}

public static class VisitasRecorridoLectura
{
    public static async Task<Dictionary<int, List<VisitaRecorridoTexto>>> PorEstablecimientos(
        SistemaOroAmbientalContext db,
        IReadOnlyCollection<int> ids)
    {
        var result = new Dictionary<int, List<VisitaRecorridoTexto>>();
        if (ids == null || ids.Count == 0)
            return result;

        var idList = ids.Where(x => x > 0).Distinct().ToList();
        if (idList.Count == 0)
            return result;

        var ests = await db.ClientesEstablecimientos.AsNoTracking()
            .Where(e => idList.Contains(e.Id))
            .Select(e => new
            {
                e.Id,
                e.IdDiaRecoleccion,
                Dia = e.IdDiaRecoleccionNavigation != null ? e.IdDiaRecoleccionNavigation.Nombre : "",
                e.IdSemanaRecoleccion,
                Semana = e.IdSemanaRecoleccionNavigation != null ? e.IdSemanaRecoleccionNavigation.Nombre : "",
                e.IdCamion,
                Camion = e.IdCamionNavigation != null ? e.IdCamionNavigation.Nombre : "",
                e.OrdenRecorrido
            })
            .ToListAsync();

        var extras = await db.ClientesEstablecimientosDias.AsNoTracking()
            .Where(d => idList.Contains(d.IdEstablecimiento) && d.IdDia > 0)
            .Select(d => new
            {
                d.IdEstablecimiento,
                d.IdDia,
                d.IdSemana,
                d.IdCamion,
                d.OrdenRecorrido
            })
            .ToListAsync();

        var diaIds = ests.Select(e => e.IdDiaRecoleccion ?? 0)
            .Concat(extras.Select(x => x.IdDia))
            .Where(x => x > 0)
            .Distinct()
            .ToList();
        var semIds = ests.Select(e => e.IdSemanaRecoleccion ?? 0)
            .Concat(extras.Select(x => x.IdSemana ?? 0))
            .Where(x => x > 0)
            .Distinct()
            .ToList();
        var camIds = ests.Select(e => e.IdCamion ?? 0)
            .Concat(extras.Select(x => x.IdCamion ?? 0))
            .Where(x => x > 0)
            .Distinct()
            .ToList();

        var dias = diaIds.Count == 0
            ? new Dictionary<int, string>()
            : await db.Dias.AsNoTracking().Where(d => diaIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.Nombre);
        var semanas = semIds.Count == 0
            ? new Dictionary<int, string>()
            : await db.Semanas.AsNoTracking().Where(s => semIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Nombre);
        var camiones = camIds.Count == 0
            ? new Dictionary<int, string>()
            : await db.Camiones.AsNoTracking().Where(c => camIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Nombre);

        foreach (var e in ests)
        {
            var list = new List<VisitaRecorridoTexto>();
            if (e.IdDiaRecoleccion is > 0 && e.IdSemanaRecoleccion is > 0)
            {
                list.Add(new VisitaRecorridoTexto
                {
                    IdDia = e.IdDiaRecoleccion.Value,
                    IdSemana = e.IdSemanaRecoleccion.Value,
                    IdCamion = e.IdCamion,
                    OrdenRecorrido = e.OrdenRecorrido,
                    Dia = e.Dia ?? "",
                    Semana = e.Semana ?? "",
                    Camion = e.Camion ?? ""
                });
            }

            foreach (var x in extras.Where(x => x.IdEstablecimiento == e.Id))
            {
                var sem = x.IdSemana is > 0 ? x.IdSemana.Value : (e.IdSemanaRecoleccion ?? 0);
                if (sem <= 0)
                    continue;

                var camion = x.IdCamion ?? 0;
                if (list.Any(v => v.IdDia == x.IdDia && v.IdSemana == sem && (v.IdCamion ?? 0) == camion))
                    continue;

                list.Add(new VisitaRecorridoTexto
                {
                    IdDia = x.IdDia,
                    IdSemana = sem,
                    IdCamion = x.IdCamion,
                    OrdenRecorrido = x.OrdenRecorrido is > 0 ? x.OrdenRecorrido : e.OrdenRecorrido,
                    Dia = dias.TryGetValue(x.IdDia, out var diaNom) ? diaNom : "",
                    Semana = semanas.TryGetValue(sem, out var semNom) ? semNom : "",
                    Camion = x.IdCamion is > 0 && camiones.TryGetValue(x.IdCamion.Value, out var camNom)
                        ? camNom
                        : (e.Camion ?? "")
                });
            }

            result[e.Id] = list;
        }

        return result;
    }
}
