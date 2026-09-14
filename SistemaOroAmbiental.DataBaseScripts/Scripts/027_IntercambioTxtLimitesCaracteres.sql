/*
  027 — Límites de caracteres del archivo de intercambio Habitat.
  Idempotente: si la columna ya tiene el ancho, no hace nada.
  Si hay unique/índice sobre la columna (p. ej. UQ_Localidades_Codigo),
  lo suelta, achica y lo vuelve a crear.
*/
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'tempdb..#ResizeVarchar') IS NOT NULL
    DROP PROCEDURE #ResizeVarchar;
GO

CREATE PROCEDURE #ResizeVarchar
    @Table  SYSNAME,
    @Column SYSNAME,
    @Length INT,
    @NotNull BIT,
    @UniqueConstraint SYSNAME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @obj INT = OBJECT_ID(N'dbo.' + @Table);
    IF @obj IS NULL
        RETURN;

    DECLARE @tipo SYSNAME;
    DECLARE @maxLen INT;
    DECLARE @isNullable BIT;

    SELECT
        @tipo = ty.name,
        @maxLen = c.max_length,
        @isNullable = c.is_nullable
    FROM sys.columns c
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    WHERE c.object_id = @obj
      AND c.name = @Column;

    IF @tipo IS NULL
        RETURN;

    IF @tipo = N'varchar' AND @maxLen = @Length AND @isNullable = CASE WHEN @NotNull = 1 THEN 0 ELSE 1 END
        RETURN;

    DECLARE @sql NVARCHAR(MAX) = N'';
    DECLARE @fullTable NVARCHAR(256) = N'dbo.' + QUOTENAME(@Table);

    SELECT @sql += N'ALTER TABLE ' + @fullTable + N' DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = @obj
      AND kc.type = N'UQ'
      AND EXISTS (
            SELECT 1
            FROM sys.index_columns ic
            JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = kc.parent_object_id
              AND ic.index_id = kc.unique_index_id
              AND c.name = @Column
        );

    SELECT @sql += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON ' + @fullTable + N';'
    FROM sys.indexes i
    WHERE i.object_id = @obj
      AND i.is_primary_key = 0
      AND i.is_unique_constraint = 0
      AND i.name IS NOT NULL
      AND EXISTS (
            SELECT 1
            FROM sys.index_columns ic
            JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id
              AND ic.index_id = i.index_id
              AND c.name = @Column
        );

    IF @sql <> N''
        EXEC sys.sp_executesql @sql;

    SET @sql = N'UPDATE ' + @fullTable
             + N' SET ' + QUOTENAME(@Column) + N' = LEFT(' + QUOTENAME(@Column) + N', ' + CAST(@Length AS NVARCHAR(10)) + N')'
             + N' WHERE ' + QUOTENAME(@Column) + N' IS NOT NULL AND LEN(' + QUOTENAME(@Column) + N') > ' + CAST(@Length AS NVARCHAR(10)) + N';';
    EXEC sys.sp_executesql @sql;

    SET @sql = N'ALTER TABLE ' + @fullTable
             + N' ALTER COLUMN ' + QUOTENAME(@Column)
             + N' VARCHAR(' + CAST(@Length AS NVARCHAR(10)) + N') '
             + CASE WHEN @NotNull = 1 THEN N'NOT NULL' ELSE N'NULL' END + N';';
    EXEC sys.sp_executesql @sql;

    IF @UniqueConstraint IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM sys.key_constraints
            WHERE parent_object_id = @obj
              AND name = @UniqueConstraint
        )
    BEGIN
        SET @sql = N'ALTER TABLE ' + @fullTable
                 + N' ADD CONSTRAINT ' + QUOTENAME(@UniqueConstraint)
                 + N' UNIQUE (' + QUOTENAME(@Column) + N');';
        EXEC sys.sp_executesql @sql;
    END
END
GO

EXEC #ResizeVarchar N'Clientes', N'Nombre', 40, 1;
EXEC #ResizeVarchar N'Clientes', N'Calle', 40, 0;
EXEC #ResizeVarchar N'Clientes', N'Numero', 5, 0;
EXEC #ResizeVarchar N'Clientes', N'PisoDepartamento', 40, 0;
EXEC #ResizeVarchar N'Clientes', N'CodPostal', 8, 0;
EXEC #ResizeVarchar N'Clientes', N'Telefono', 30, 0;
EXEC #ResizeVarchar N'Clientes', N'TelefonoAlt', 30, 0;
EXEC #ResizeVarchar N'Clientes', N'Cuit', 13, 0;

EXEC #ResizeVarchar N'ClientesEstablecimientos', N'Calle', 40, 0;
EXEC #ResizeVarchar N'ClientesEstablecimientos', N'Numero', 5, 0;
EXEC #ResizeVarchar N'ClientesEstablecimientos', N'PisoDepartamento', 40, 0;
EXEC #ResizeVarchar N'ClientesEstablecimientos', N'CodPostal', 8, 0;
EXEC #ResizeVarchar N'ClientesEstablecimientos', N'Cuit', 13, 0;

EXEC #ResizeVarchar N'Localidades', N'Codigo', 4, 1, N'UQ_Localidades_Codigo';
EXEC #ResizeVarchar N'Partidos', N'Codigo', 4, 1, N'UQ_Partidos_Codigo';
GO

DROP PROCEDURE #ResizeVarchar;
GO

PRINT '027_IntercambioTxtLimitesCaracteres.sql ejecutado correctamente.';
GO
