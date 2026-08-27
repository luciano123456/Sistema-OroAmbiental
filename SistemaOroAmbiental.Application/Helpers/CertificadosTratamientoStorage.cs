using SistemaOroAmbiental.Application.Helpers;
using SistemaOroAmbiental.DAL.Repository;
using SistemaOroAmbiental.Models;

namespace SistemaOroAmbiental.Application.Helpers
{
    public class CertificadosTratamientoStorage
    {
        private readonly IWebHostEnvironment _env;
        private readonly IClientesCertificadosTratamientoRepository _repo;

        public CertificadosTratamientoStorage(
            IWebHostEnvironment env,
            IClientesCertificadosTratamientoRepository repo)
        {
            _env = env;
            _repo = repo;
        }

        public string CertificadosFolder(int idCliente)
        {
            var rel = Path.Combine("uploads", "certificados", idCliente.ToString());
            var abs = Path.Combine(_env.WebRootPath, rel);
            if (!Directory.Exists(abs))
                Directory.CreateDirectory(abs);
            return rel.Replace('\\', '/');
        }

        public string AbsPath(string rutaRelativa)
            => Path.Combine(_env.WebRootPath, rutaRelativa.Replace('/', Path.DirectorySeparatorChar));

        public async Task<List<CertificadoTratamientoItemDto>> GenerarYGuardarLote(
            ManifiestosHojaDto model,
            GuardarHistorialManifiestoResultDto historial,
            DateTime fechaEmision,
            int numeroCertificadoInicial,
            DateTime fechaTratamiento,
            int numeroOrdenInicial,
            int idCamion,
            int idUsuario)
        {
            var certItems = new List<CertificadoTratamientoItemDto>();
            var entidades = new List<ClientesCertificadoTratamiento>();
            var ahora = DateTime.Now;

            var mapHist = historial.Items
                .GroupBy(x => x.Numero)
                .ToDictionary(g => g.Key, g => g.First());

            for (var i = 0; i < model.Items.Count; i++)
            {
                var item = model.Items[i];
                var nCert = numeroCertificadoInicial + i;
                var nOrden = numeroOrdenInicial + i;

                var certDto = CertificadoTratamientoPdfGenerator.DesdeManifiestoItem(
                    item, fechaEmision, nCert, fechaTratamiento, nOrden);
                certItems.Add(certDto);

                if (item.IdCliente is not > 0)
                    continue;

                mapHist.TryGetValue(item.Numero, out var hist);
                var nombreArchivo = CertificadoTratamientoPdfGenerator.NombreArchivo(certDto);
                var folderRel = CertificadosFolder(item.IdCliente.Value);
                var rutaRel = $"{folderRel}/{nombreArchivo}";
                var abs = AbsPath(rutaRel);

                byte[] pdfBytes;
                try
                {
                    pdfBytes = CertificadoTratamientoPdfGenerator.Generar(certDto);
                    await File.WriteAllBytesAsync(abs, pdfBytes);
                }
                catch
                {
                    // Si no se puede persistir el archivo, igual devolvemos el DTO para el ZIP de descarga.
                    continue;
                }

                entidades.Add(new ClientesCertificadoTratamiento
                {
                    IdCliente = item.IdCliente.Value,
                    IdEstablecimiento = item.IdEstablecimientoDb,
                    IdManifiestoHistorial = hist?.Id > 0 ? hist.Id : null,
                    NumeroManifiesto = item.Numero,
                    NumeroCertificado = nCert,
                    NumeroOrdenOperaciones = nOrden,
                    FechaEmision = fechaEmision.Date,
                    FechaTratamiento = fechaTratamiento.Date,
                    Cantidad = Truncar(item.Cantidad, 40) ?? "",
                    RazonSocial = Truncar(item.RazonSocial, 200) ?? "",
                    CheNro = Truncar(item.IdEstablecimiento, 40),
                    Calle = Truncar(item.Calle, 120),
                    NumeroCalle = Truncar(item.NumeroCalle, 20),
                    Piso = Truncar(item.Piso, 40),
                    Localidad = Truncar(item.Localidad, 120),
                    Cuit = Truncar(item.Cuit, 30),
                    RutaPdf = Truncar(rutaRel, 500) ?? rutaRel,
                    NombreArchivo = Truncar(nombreArchivo, 200) ?? nombreArchivo,
                    FechaGeneracion = ahora,
                    IdUsuario = idUsuario > 0 ? idUsuario : null,
                    IdCamion = idCamion > 0 ? idCamion : null,
                    IdSemana = item.IdSemana > 0 ? item.IdSemana : null,
                    IdDia = item.IdDia > 0 ? item.IdDia : null
                });
            }

            if (entidades.Count > 0)
            {
                try
                {
                    await _repo.InsertarLote(entidades);
                    var ultCert = entidades.Max(x => x.NumeroCertificado);
                    var ultOrden = entidades.Max(x => x.NumeroOrdenOperaciones);
                    await _repo.ActualizarContador(ultCert, ultOrden, idUsuario);
                }
                catch
                {
                    // Persistencia opcional: el PDF del lote se arma igual con certItems.
                }
            }

            return certItems;
        }

        private static string? Truncar(string? valor, int max)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return null;
            var t = valor.Trim();
            return t.Length <= max ? t : t[..max];
        }

        public async Task<List<CertificadoTratamientoItemDto>> GenerarDesdeHistorial(
            ManifiestosHojaDto model,
            int idManifiestoHistorial,
            DateTime fechaEmision,
            int numeroCertificado,
            DateTime fechaTratamiento,
            int numeroOrden,
            int idCamion,
            int idUsuario)
        {
            var item = model.Items.FirstOrDefault();
            if (item == null || item.IdCliente is not > 0)
                return new List<CertificadoTratamientoItemDto>();

            var certDto = CertificadoTratamientoPdfGenerator.DesdeManifiestoItem(
                item, fechaEmision, numeroCertificado, fechaTratamiento, numeroOrden);

            var nombreArchivo = CertificadoTratamientoPdfGenerator.NombreArchivo(certDto);
            var folderRel = CertificadosFolder(item.IdCliente.Value);
            var rutaRel = $"{folderRel}/{nombreArchivo}";
            var pdfBytes = CertificadoTratamientoPdfGenerator.Generar(certDto);
            await File.WriteAllBytesAsync(AbsPath(rutaRel), pdfBytes);

            await _repo.InsertarLote(new[]
            {
                new ClientesCertificadoTratamiento
                {
                    IdCliente = item.IdCliente.Value,
                    IdEstablecimiento = item.IdEstablecimientoDb,
                    IdManifiestoHistorial = idManifiestoHistorial,
                    NumeroManifiesto = item.Numero,
                    NumeroCertificado = numeroCertificado,
                    NumeroOrdenOperaciones = numeroOrden,
                    FechaEmision = fechaEmision.Date,
                    FechaTratamiento = fechaTratamiento.Date,
                    Cantidad = item.Cantidad ?? "",
                    RazonSocial = item.RazonSocial ?? "",
                    CheNro = item.IdEstablecimiento,
                    Calle = item.Calle,
                    NumeroCalle = item.NumeroCalle,
                    Piso = item.Piso,
                    Localidad = item.Localidad,
                    Cuit = item.Cuit,
                    RutaPdf = rutaRel,
                    NombreArchivo = nombreArchivo,
                    FechaGeneracion = DateTime.Now,
                    IdUsuario = idUsuario > 0 ? idUsuario : null,
                    IdCamion = idCamion > 0 ? idCamion : null,
                    IdSemana = item.IdSemana > 0 ? item.IdSemana : null,
                    IdDia = item.IdDia > 0 ? item.IdDia : null
                }
            });

            await _repo.ActualizarContador(numeroCertificado, numeroOrden, idUsuario);
            return new List<CertificadoTratamientoItemDto> { certDto };
        }
    }
}
