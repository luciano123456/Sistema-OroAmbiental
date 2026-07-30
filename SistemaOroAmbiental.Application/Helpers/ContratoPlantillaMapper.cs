using SistemaOroAmbiental.Application.Models.ViewModels;
using SistemaOroAmbiental.Models;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace SistemaOroAmbiental.Application.Helpers
{
    public static class ContratoPlantillaMapper
    {
        public static VMContratoDatosPlantilla Map(Contrato c)
        {
            var hoy = DateTime.Today;
            var cli = c.IdClienteNavigation;
            var est = c.IdEstablecimientoNavigation;
            var nombreBase = $"{cli?.Nombre}_{est?.Nombre}".Trim('_');

            var domicilioEst = est?.Domicilio?.Trim() ?? "";
            var domicilioCli = cli?.Domicilio?.Trim() ?? "";
            var domicilioGen = !string.IsNullOrWhiteSpace(domicilioEst) ? domicilioEst : domicilioCli;

            var localidadEst = est?.Localidad?.Trim() ?? "";
            var provinciaEst = est?.IdProvinciaNavigation?.Nombre?.Trim() ?? "";
            var provinciaCli = cli?.IdProvinciaNavigation?.Nombre?.Trim() ?? "";
            var cpEst = est?.CodPostal?.Trim() ?? "";
            var cpCli = cli?.CodPostal?.Trim() ?? "";

            var localidadGen = ArmarLocalidadCompleta(
                localidadEst,
                !string.IsNullOrWhiteSpace(provinciaEst) ? provinciaEst : provinciaCli,
                !string.IsNullOrWhiteSpace(cpEst) ? cpEst : cpCli);

            var iva = est?.IdCondicionIvaNavigation?.Nombre?.Trim()
                ?? cli?.IdCondicionIvaNavigation?.Nombre?.Trim() ?? "";
            var profesion = cli?.IdProfesionNavigation?.Nombre?.Trim() ?? "";
            var nombreCliente = cli?.Nombre?.Trim() ?? "";
            var telefono = cli?.Telefono?.Trim() ?? cli?.TelefonoAlt?.Trim() ?? "";
            var email = cli?.Email?.Trim() ?? "";
            var cuit = !string.IsNullOrWhiteSpace(est?.Cuit) ? est.Cuit!.Trim() : (cli?.Cuit?.Trim() ?? "");
            var diasHorarios = ArmarDiasHorariosCliente(est);

            // {DIA} {MES} {ANIO} en plantilla = fecha inicio del contrato (no fecha de firma)
            var fechaInicio = c.FechaInicio != default ? c.FechaInicio : c.FechaContrato;
            if (fechaInicio == default)
                fechaInicio = hoy;

            var (dia, mes, anio) = PartesFecha(fechaInicio);
            var (diaContrato, mesContrato, anioContrato) = PartesFecha(
                c.FechaContrato != default ? c.FechaContrato : fechaInicio);

            return new VMContratoDatosPlantilla
            {
                Id = c.Id,
                IdCliente = c.IdCliente,
                IdEstablecimiento = c.IdEstablecimiento,
                IdTipoContrato = c.IdTipoContrato,
                Cliente = nombreCliente,
                NombreCliente = nombreCliente,
                Establecimiento = est?.Nombre ?? "",
                TipoContrato = c.IdTipoContratoNavigation?.Nombre ?? "",
                Sucursal = cli?.IdSucursalNavigation?.Nombre ?? "",
                CuitCliente = cuit,
                DomicilioCliente = domicilioGen,
                TelefonoCliente = telefono,
                EmailCliente = email,
                LocalidadCliente = localidadGen,
                ProvinciaCliente = !string.IsNullOrWhiteSpace(provinciaEst) ? provinciaEst : provinciaCli,
                CodPostalCliente = !string.IsNullOrWhiteSpace(cpEst) ? cpEst : cpCli,
                CondicionIvaCliente = iva,
                IvaCliente = iva,
                CuitEstablecimiento = est?.Cuit ?? "",
                DomicilioEstablecimiento = domicilioEst,
                LocalidadEstablecimiento = localidadEst,
                ProvinciaEstablecimiento = provinciaEst,
                Profesion = profesion,
                ProfesionCliente = profesion,
                Generador = nombreCliente,
                DomicilioGenerador = domicilioGen,
                DomicilioConsultorio = domicilioGen,
                CuitGenerador = cuit,
                TelefonoGenerador = telefono,
                EmailGenerador = email,
                LocalidadGenerador = localidadGen,
                ProvinciaGenerador = !string.IsNullOrWhiteSpace(provinciaEst) ? provinciaEst : provinciaCli,
                DiasHorariosCliente = diasHorarios,
                DiaRecoleccion = est?.IdDiaRecoleccionNavigation?.Nombre ?? "",
                SemanaRecoleccion = est?.IdSemanaRecoleccionNavigation?.Nombre ?? "",
                HorarioRecoleccion = est != null
                    ? (!string.IsNullOrWhiteSpace(est.DiasHorarios)
                        ? est.DiasHorarios.Trim()
                        : $"{FormatearHorarioRecoleccion(est.HorarioRecoleccionDesde)} a {FormatearHorarioRecoleccion(est.HorarioRecoleccionHasta)}")
                    : "",
                Ciudad = "Buenos Aires",
                Empresa = "ORO AMBIENTAL GROUP S.R.L.",
                OperadorNumero = "7566",
                Dia = dia,
                Mes = mes,
                Anio = anio,
                DiaContrato = diaContrato,
                MesContrato = mesContrato,
                AnioContrato = anioContrato,
                FechaContrato = c.FechaContrato,
                FechaInicio = c.FechaInicio,
                FechaVencimiento = c.FechaVencimiento,
                Vigente = c.FechaVencimiento >= hoy,
                NombreArchivo = string.IsNullOrWhiteSpace(nombreBase) ? $"Contrato_{c.Id}" : nombreBase
            };
        }

        public static string BuildNombreArchivo(VMContratoDatosPlantilla d)
        {
            var cliente = SanitizeFileName(d.NombreCliente);
            var fecha = d.FechaContrato != default
                ? d.FechaContrato.ToString("yyyyMMdd")
                : DateTime.Today.ToString("yyyyMMdd");
            return $"CONTRATO_{cliente}_{fecha}";
        }

        public static Dictionary<string, string> ToCamposDocx(VMContratoDatosPlantilla d)
        {
            var nombreArchivo = BuildNombreArchivo(d);
            var mapa = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            void Agregar(string clave, string? valor)
            {
                if (string.IsNullOrWhiteSpace(clave)) return;
                mapa[clave.Trim()] = valor ?? "";
            }

            // Plantilla Oro Ambiental 2026 — usar siempre {NOMBRE} en Word
            Agregar("NOMBRECLIENTE", d.NombreCliente);
            Agregar("DOMICILIOCLIENTE", d.DomicilioCliente);
            Agregar("LOCALIDADCLIENTE", d.LocalidadCliente);
            Agregar("TELEFONOCLIENTE", d.TelefonoCliente);
            Agregar("CUITCLIENTE", d.CuitCliente);
            Agregar("PROFESIONCLIENTE", d.ProfesionCliente);
            Agregar("IVACLIENTE", d.IvaCliente);
            Agregar("DIASCLIENTE", d.DiasHorariosCliente);
            Agregar("EMAILCLIENTE", d.EmailCliente);
            Agregar("DIA", d.Dia);
            Agregar("MES", d.Mes);
            Agregar("ANIO", d.Anio);
            Agregar("DIAINICIO", d.Dia);
            Agregar("MESINICIO", d.Mes);
            Agregar("ANIOINICIO", d.Anio);
            Agregar("FECHAINICIO", d.FechaInicio != default
                ? d.FechaInicio.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)
                : "");
            Agregar("DIACONTRATO", d.DiaContrato);
            Agregar("MESCONTRATO", d.MesContrato);
            Agregar("ANIOCONTRATO", d.AnioContrato);
            Agregar("FECHACONTRATO", d.FechaContrato != default
                ? d.FechaContrato.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)
                : "");
            Agregar("CIUDAD", d.Ciudad);
            Agregar("EMPRESA", d.Empresa);
            Agregar("OPERADOR", d.OperadorNumero);
            Agregar("OPERADORNUMERO", d.OperadorNumero);

            // Alias frecuentes (misma clave entre llaves)
            Agregar("CLIENTE", d.NombreCliente);
            Agregar("GENERADOR", d.Generador);
            Agregar("NOMBRE", d.NombreCliente);
            Agregar("DOMICILIO", d.DomicilioCliente);
            Agregar("LOCALIDAD", d.LocalidadCliente);
            Agregar("TELEFONO", d.TelefonoCliente);
            Agregar("CUIT", d.CuitCliente);
            Agregar("PROFESION", d.Profesion);
            Agregar("IVA", d.IvaCliente);
            Agregar("EMAIL", d.EmailCliente);
            Agregar("DIAS", d.DiasHorariosCliente);
            Agregar("HORARIO", d.HorarioRecoleccion);
            Agregar("ESTABLECIMIENTO", d.Establecimiento);

            Agregar("NombreArchivo", nombreArchivo);

            return mapa;
        }

        private static (string Dia, string Mes, string Anio) PartesFecha(DateTime fecha)
        {
            var cultura = new CultureInfo("es-AR");
            var mes = fecha.ToString("MMMM", cultura);
            if (!string.IsNullOrEmpty(mes))
                mes = char.ToUpper(mes[0], cultura) + mes[1..];
            return (fecha.Day.ToString(), mes, fecha.Year.ToString());
        }

        private static string FormatearHorarioRecoleccion(TimeSpan t)
            => $"{t.Hours:D2}:{t.Minutes:D2}";

        private static string ArmarLocalidadCompleta(string? localidad, string? provincia, string? codPostal)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(localidad)) parts.Add(localidad.Trim());
            if (!string.IsNullOrWhiteSpace(provincia)) parts.Add(provincia.Trim());
            if (!string.IsNullOrWhiteSpace(codPostal)) parts.Add($"CP {codPostal.Trim()}");
            return string.Join(", ", parts);
        }

        private static string ArmarDiasHorariosCliente(ClientesEstablecimiento? est)
        {
            if (est == null) return "";

            if (!string.IsNullOrWhiteSpace(est.DiasHorarios))
                return est.DiasHorarios.Trim();

            var dia = est.IdDiaRecoleccionNavigation?.Nombre?.Trim() ?? "";
            var semana = est.IdSemanaRecoleccionNavigation?.Nombre?.Trim() ?? "";
            var desde = FormatearHorarioRecoleccion(est.HorarioRecoleccionDesde);
            var hasta = FormatearHorarioRecoleccion(est.HorarioRecoleccionHasta);
            var horario = (est.HorarioRecoleccionDesde != default || est.HorarioRecoleccionHasta != default)
                ? $"{desde} a {hasta}"
                : "";

            var partes = new List<string>();
            if (!string.IsNullOrWhiteSpace(dia)) partes.Add(dia);
            if (!string.IsNullOrWhiteSpace(semana)) partes.Add(semana);
            var cabecera = string.Join(" - ", partes);

            if (!string.IsNullOrWhiteSpace(cabecera) && !string.IsNullOrWhiteSpace(horario))
                return $"{cabecera} ({horario})";
            if (!string.IsNullOrWhiteSpace(horario))
                return horario;
            return cabecera;
        }

        private static string SanitizeFileName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "Cliente";
            var normalized = name.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    sb.Append(ch);
            }
            var s = Regex.Replace(sb.ToString(), @"[^\w\-]", "_");
            s = Regex.Replace(s, @"_+", "_").Trim('_');
            return s.Length > 60 ? s[..60] : (string.IsNullOrEmpty(s) ? "Cliente" : s);
        }
    }
}
