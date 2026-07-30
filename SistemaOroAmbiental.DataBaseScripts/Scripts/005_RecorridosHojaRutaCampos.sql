/*
  005 — Recorridos: horario de salida por ruta y observación por cliente en ruta.
  Ejecutar en SistemaDB después de 002. Idempotente.
*/

SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.RecorridosMatriz', 'HorarioSalida') IS NULL
    ALTER TABLE dbo.RecorridosMatriz ADD HorarioSalida VARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.ClientesRecorridos', 'Observacion') IS NULL
    ALTER TABLE dbo.ClientesRecorridos ADD Observacion VARCHAR(500) NULL;
GO

PRINT '005_RecorridosHojaRutaCampos.sql ejecutado.';
GO
