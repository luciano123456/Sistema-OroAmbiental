/*
  007 — Campos de recorrido en establecimientos (orden, kilos).
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'OrdenRecorrido') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD OrdenRecorrido INT NULL;
GO

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'Kilos') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD Kilos DECIMAL(10, 2) NULL;
GO

IF COL_LENGTH('dbo.ClientesEstablecimientosDias', 'IdCamion') IS NULL
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientosDias ADD IdCamion INT NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientosDias_Camiones')
        ALTER TABLE dbo.ClientesEstablecimientosDias ADD CONSTRAINT FK_ClientesEstablecimientosDias_Camiones
            FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id);
END
GO

PRINT '007_ClientesEstablecimientosRecorridoCampos.sql ejecutado correctamente.';
