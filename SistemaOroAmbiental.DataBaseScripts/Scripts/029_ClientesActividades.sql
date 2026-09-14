/*
  029 — Catálogo de actividades por establecimiento (carpintero, odontólogo, etc.)
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.ClientesActividades', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesActividades (
        Id     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre VARCHAR(150) NOT NULL,
        CONSTRAINT UQ_ClientesActividades_Nombre UNIQUE (Nombre)
    );
END;

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdActividad') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdActividad INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientos_ClientesActividades')
    ALTER TABLE dbo.ClientesEstablecimientos ADD CONSTRAINT FK_ClientesEstablecimientos_ClientesActividades
        FOREIGN KEY (IdActividad) REFERENCES dbo.ClientesActividades(Id);

GO

PRINT '029_ClientesActividades.sql ejecutado correctamente.';
