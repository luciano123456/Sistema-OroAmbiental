/*
  037 — Localidad del domicilio particular del cliente.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.Clientes', N'IdLocalidad') IS NULL
BEGIN
    ALTER TABLE dbo.Clientes ADD IdLocalidad INT NULL;
    PRINT N'OK: Clientes.IdLocalidad agregada.';
END
ELSE
    PRINT N'Skip: Clientes.IdLocalidad ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_Clientes_Localidades'
      AND parent_object_id = OBJECT_ID(N'dbo.Clientes')
)
BEGIN
    ALTER TABLE dbo.Clientes WITH CHECK
    ADD CONSTRAINT FK_Clientes_Localidades
        FOREIGN KEY (IdLocalidad) REFERENCES dbo.Localidades (Id);
    PRINT N'OK: FK Clientes → Localidades.';
END
ELSE
    PRINT N'Skip: FK Clientes → Localidades ya existe.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Clientes_IdLocalidad'
      AND object_id = OBJECT_ID(N'dbo.Clientes')
)
BEGIN
    CREATE INDEX IX_Clientes_IdLocalidad ON dbo.Clientes (IdLocalidad);
    PRINT N'OK: indice IX_Clientes_IdLocalidad.';
END
ELSE
    PRINT N'Skip: indice IX_Clientes_IdLocalidad ya existe.';
GO
