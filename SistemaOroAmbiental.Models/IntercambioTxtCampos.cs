namespace SistemaOroAmbiental.Models;

/// <summary>
/// Anchos del instructivo Habitat (archivo de intercambio).
/// Lo que el operador carga no puede superar estos máximos.
/// </summary>
public static class IntercambioTxtCampos
{
    public const int RazonSocial = 40;
    public const int NombreFantasia = 40;
    public const int Calle = 40;
    public const int Numero = 5;
    public const int CodigoPostal = 8;
    public const int Adicional = 40;
    public const int Telefono = 30;
    public const int Cuit = 13;
    public const int CodigoLocalidad = 4;
    public const int CodigoPartido = 4;
    public const int CodigoOpds = 8;

    public static string Recortar(string? valor, int max)
    {
        var texto = (valor ?? "").Trim();
        if (max < 0) max = 0;
        return texto.Length <= max ? texto : texto[..max];
    }

    public static string? RecortarOpcional(string? valor, int max)
    {
        if (valor == null) return null;
        var texto = Recortar(valor, max);
        return texto.Length == 0 ? "" : texto;
    }

    public static void Aplicar(Cliente model)
    {
        model.Nombre = Recortar(model.Nombre, RazonSocial);
        model.Calle = RecortarOpcional(model.Calle, Calle);
        model.Numero = RecortarOpcional(model.Numero, Numero);
        model.PisoDepartamento = RecortarOpcional(model.PisoDepartamento, Adicional);
        model.CodPostal = RecortarOpcional(model.CodPostal, CodigoPostal);
        model.Telefono = RecortarOpcional(model.Telefono, Telefono);
        model.TelefonoAlt = RecortarOpcional(model.TelefonoAlt, Telefono);
        model.Cuit = RecortarOpcional(model.Cuit, Cuit);
    }

    public static void Aplicar(ClientesEstablecimiento model)
    {
        model.IdEstablecimientoCliente = RecortarOpcional(model.IdEstablecimientoCliente, CodigoOpds);
        model.Calle = RecortarOpcional(model.Calle, Calle);
        model.Numero = RecortarOpcional(model.Numero, Numero);
        model.PisoDepartamento = RecortarOpcional(model.PisoDepartamento, Adicional);
        model.CodPostal = RecortarOpcional(model.CodPostal, CodigoPostal);
        model.Cuit = RecortarOpcional(model.Cuit, Cuit);
    }

    public static void Aplicar(Localidad model)
        => model.Codigo = Recortar(model.Codigo, CodigoLocalidad);

    public static void Aplicar(Partido model)
        => model.Codigo = Recortar(model.Codigo, CodigoPartido);
}
