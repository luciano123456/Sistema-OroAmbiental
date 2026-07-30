/*
  011 — Partido y localidad pertenecen a ClientesEstablecimientos.
  No migra datos existentes desde Clientes.
  Ejecutar manualmente en la base SistemaDB.
*/
SET NOCOUNT ON;
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE dbo.Clientes DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
WHERE fk.parent_object_id = OBJECT_ID(N'dbo.Clientes')
  AND c.name IN (N'IdLocalidad', N'IdPartido');

IF @sql <> N'' EXEC sys.sp_executesql @sql;
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE dbo.Clientes DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Clientes')
  AND c.name IN (N'IdLocalidad', N'IdPartido', N'Localidad');

IF @sql <> N'' EXEC sys.sp_executesql @sql;
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON dbo.Clientes;'
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID(N'dbo.Clientes')
  AND i.is_primary_key = 0
  AND i.is_unique_constraint = 0
  AND EXISTS
  (
      SELECT 1
      FROM sys.index_columns ic
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE ic.object_id = i.object_id
        AND ic.index_id = i.index_id
        AND c.name IN (N'IdLocalidad', N'IdPartido', N'Localidad')
  );

IF @sql <> N'' EXEC sys.sp_executesql @sql;
GO

IF COL_LENGTH(N'dbo.Clientes', N'IdLocalidad') IS NOT NULL
    ALTER TABLE dbo.Clientes DROP COLUMN IdLocalidad;
GO

IF COL_LENGTH(N'dbo.Clientes', N'IdPartido') IS NOT NULL
    ALTER TABLE dbo.Clientes DROP COLUMN IdPartido;
GO

IF COL_LENGTH(N'dbo.Clientes', N'Localidad') IS NOT NULL
    ALTER TABLE dbo.Clientes DROP COLUMN Localidad;
GO

IF COL_LENGTH(N'dbo.ClientesEstablecimientos', N'IdLocalidad') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdLocalidad INT NULL;
GO

IF COL_LENGTH(N'dbo.ClientesEstablecimientos', N'IdPartido') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdPartido INT NULL;
GO

UPDATE e
SET IdLocalidad = NULL
FROM dbo.ClientesEstablecimientos e
WHERE e.IdLocalidad IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Localidades l WHERE l.Id = e.IdLocalidad);
GO

UPDATE e
SET IdPartido = NULL
FROM dbo.ClientesEstablecimientos e
WHERE e.IdPartido IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Partidos p WHERE p.Id = e.IdPartido);
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_key_columns fkc
    JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
    WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ClientesEstablecimientos')
      AND c.name = N'IdLocalidad'
)
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientos WITH CHECK
        ADD CONSTRAINT FK_ClientesEstablecimientos_Localidades
        FOREIGN KEY (IdLocalidad) REFERENCES dbo.Localidades(Id);
    ALTER TABLE dbo.ClientesEstablecimientos
        CHECK CONSTRAINT FK_ClientesEstablecimientos_Localidades;
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_key_columns fkc
    JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
    WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ClientesEstablecimientos')
      AND c.name = N'IdPartido'
)
BEGIN
    ALTER TABLE dbo.ClientesEstablecimientos WITH CHECK
        ADD CONSTRAINT FK_ClientesEstablecimientos_Partidos
        FOREIGN KEY (IdPartido) REFERENCES dbo.Partidos(Id);
    ALTER TABLE dbo.ClientesEstablecimientos
        CHECK CONSTRAINT FK_ClientesEstablecimientos_Partidos;
END;
GO

PRINT '011_ClientesGeoEnEstablecimientos.sql ejecutado correctamente.';
