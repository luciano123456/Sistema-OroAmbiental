/*
  038 — Varias visitas de recorrido por establecimiento.
  Cada fila extra guarda su propia semana y su número de recorrido.
  La visita principal sigue en ClientesEstablecimientos (día, semana, unidad, orden).
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.ClientesEstablecimientosDias', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.ClientesEstablecimientosDias', 'IdSemana') IS NULL
        ALTER TABLE dbo.ClientesEstablecimientosDias ADD IdSemana INT NULL;

    IF COL_LENGTH('dbo.ClientesEstablecimientosDias', 'OrdenRecorrido') IS NULL
        ALTER TABLE dbo.ClientesEstablecimientosDias ADD OrdenRecorrido INT NULL;

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
GO

PRINT '038_EstablecimientosVisitasRecorrido.sql ejecutado correctamente.';
