using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.BLL.Common;

/// <summary>
/// Replica copias por cliente. Todas las copias del mismo cliente
/// llevan el mismo N° de manifiesto; el correlativo avanza por cliente.
/// </summary>
public static class ManifiestoCopiasHelper
{
    public const int MaxCopias = 50;

    public static void Expandir(ManifiestosHojaDto? model, IReadOnlyDictionary<int, int>? copiasPorRecorrido)
    {
        if (model?.Items == null || copiasPorRecorrido == null || copiasPorRecorrido.Count == 0)
            return;

        var expanded = new List<ManifiestoItemDto>();
        var numero = model.NumeroInicial > 0 ? model.NumeroInicial : 1;
        foreach (var item in model.Items)
        {
            var n = copiasPorRecorrido.TryGetValue(item.IdRecorrido, out var c) ? c : 1;
            if (n <= 0) continue;
            if (n > MaxCopias) n = MaxCopias;
            for (var i = 0; i < n; i++)
            {
                var copia = Clonar(item);
                copia.Numero = numero;
                expanded.Add(copia);
            }
            numero++;
        }

        model.Items = expanded;
    }

    public static List<ManifiestoItemDto> UnicosPorRecorrido(IEnumerable<ManifiestoItemDto>? items)
    {
        if (items == null)
            return new List<ManifiestoItemDto>();

        return items
            .GroupBy(x => x.IdRecorrido > 0 ? x.IdRecorrido : unchecked((long)x.Numero << 32 ^ x.IdCliente))
            .Select(g => g.First())
            .ToList();
    }

    private static ManifiestoItemDto Clonar(ManifiestoItemDto x) => new()
    {
        IdRecorrido = x.IdRecorrido,
        IdCliente = x.IdCliente,
        IdEstablecimientoDb = x.IdEstablecimientoDb,
        IdSemana = x.IdSemana,
        IdDia = x.IdDia,
        Posicion = x.Posicion,
        Numero = x.Numero,
        IdEstablecimiento = x.IdEstablecimiento,
        RazonSocial = x.RazonSocial,
        Cuit = x.Cuit,
        Direccion = x.Direccion,
        Localidad = x.Localidad,
        Telefono = x.Telefono,
        Domicilio = x.Domicilio,
        Cantidad = x.Cantidad,
        Calle = x.Calle,
        NumeroCalle = x.NumeroCalle,
        Piso = x.Piso
    };
}
