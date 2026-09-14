/*
  024 — Clientes en recorrido: marca Reprogramado (se muestra en rojo
        en la lista y en la hoja de ruta).
  Ejecutar en SistemaDB después de 005. Idempotente.
*/

SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.ClientesRecorridos', 'Reprogramado') IS NULL
    ALTER TABLE dbo.ClientesRecorridos ADD Reprogramado BIT NOT NULL
        CONSTRAINT DF_ClientesRecorridos_Reprogramado DEFAULT(0);
GO

PRINT '024_ClientesRecorridosReprogramado.sql ejecutado.';
GO
