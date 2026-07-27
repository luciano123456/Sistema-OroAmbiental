/*
  001 — Clientes (estado/motivo/calificación), geo con códigos, camiones, FKs.
  Ejecutar en la base SistemaDB. Idempotente donde es posible.
*/

SET NOCOUNT ON;
GO

/* ============================================================
   PROVINCIAS — agregar Codigo
   ============================================================ */
IF COL_LENGTH('dbo.Provincias', 'Codigo') IS NULL
    ALTER TABLE dbo.Provincias ADD Codigo VARCHAR(10) NULL;
GO

UPDATE p SET p.Codigo = v.Codigo
FROM dbo.Provincias p
INNER JOIN (VALUES
    ('Buenos Aires', '06'),
    ('Ciudad Autónoma de Buenos Aires', '02'),
    ('Catamarca', '10'),
    ('Chaco', '22'),
    ('Chubut', '26'),
    ('Córdoba', '14'),
    ('Corrientes', '18'),
    ('Entre Ríos', '08'),
    ('Formosa', '34'),
    ('Jujuy', '38'),
    ('La Pampa', '42'),
    ('La Rioja', '46'),
    ('Mendoza', '50'),
    ('Misiones', '54'),
    ('Neuquén', '58'),
    ('Río Negro', '62'),
    ('Salta', '66'),
    ('San Juan', '70'),
    ('San Luis', '74'),
    ('Santa Cruz', '78'),
    ('Santa Fe', '82'),
    ('Santiago del Estero', '86'),
    ('Tierra del Fuego, Antártida e Islas del Atlántico Sur', '94'),
    ('Tucumán', '90')
) v(Nombre, Codigo) ON LTRIM(RTRIM(p.Nombre)) = v.Nombre
WHERE p.Codigo IS NULL OR LTRIM(RTRIM(p.Codigo)) = '';
GO

/* ============================================================
   PARTIDOS
   ============================================================ */
IF OBJECT_ID(N'dbo.Partidos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Partidos (
        Id       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Codigo   VARCHAR(20)  NOT NULL,
        Nombre   VARCHAR(120) NOT NULL,
        IdProvincia INT NOT NULL,
        CONSTRAINT UQ_Partidos_Codigo UNIQUE (Codigo),
        CONSTRAINT FK_Partidos_Provincias FOREIGN KEY (IdProvincia) REFERENCES dbo.Provincias(Id)
    );
    CREATE INDEX IX_Partidos_IdProvincia ON dbo.Partidos(IdProvincia);
END
GO

/* ============================================================
   LOCALIDADES
   ============================================================ */
IF OBJECT_ID(N'dbo.Localidades', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Localidades (
        Id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Codigo      VARCHAR(20)  NOT NULL,
        Nombre      VARCHAR(120) NOT NULL,
        IdPartido   INT NULL,
        IdProvincia INT NOT NULL,
        CONSTRAINT UQ_Localidades_Codigo UNIQUE (Codigo),
        CONSTRAINT FK_Localidades_Partidos FOREIGN KEY (IdPartido) REFERENCES dbo.Partidos(Id),
        CONSTRAINT FK_Localidades_Provincias FOREIGN KEY (IdProvincia) REFERENCES dbo.Provincias(Id)
    );
    CREATE INDEX IX_Localidades_IdPartido ON dbo.Localidades(IdPartido);
    CREATE INDEX IX_Localidades_IdProvincia ON dbo.Localidades(IdProvincia);
END
GO

/* ============================================================
   CLIENTES — catálogos estado, motivo, calificación
   ============================================================ */
IF OBJECT_ID(N'dbo.ClientesEstados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesEstados (
        Id     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre VARCHAR(100) NOT NULL
    );
    INSERT INTO dbo.ClientesEstados (Nombre) VALUES
        ('Activo'), ('Inactivo'), ('Baja'), ('Suspendido'), ('En gestión'), ('Licencia');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ClientesEstados WHERE Nombre = 'Licencia')
    INSERT INTO dbo.ClientesEstados (Nombre) VALUES ('Licencia');
GO

IF OBJECT_ID(N'dbo.ClientesMotivos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesMotivos (
        Id     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre VARCHAR(200) NOT NULL
    );
    INSERT INTO dbo.ClientesMotivos (Nombre) VALUES
        ('Falta de pago'),
        ('Cambio de proveedor'),
        ('Cierre del establecimiento'),
        ('Traslado'),
        ('Otro');
END
GO

IF OBJECT_ID(N'dbo.ClientesCalificaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesCalificaciones (
        Id     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre VARCHAR(100) NOT NULL,
        Nivel  INT NOT NULL CONSTRAINT DF_ClientesCalificaciones_Nivel DEFAULT (0)
    );
    INSERT INTO dbo.ClientesCalificaciones (Nombre, Nivel) VALUES
        ('Excelente', 5),
        ('Muy bueno', 4),
        ('Bueno', 3),
        ('Regular', 2),
        ('Malo', 1);
END
GO

IF COL_LENGTH('dbo.Clientes', 'IdEstado') IS NULL
    ALTER TABLE dbo.Clientes ADD IdEstado INT NULL;
GO
IF COL_LENGTH('dbo.Clientes', 'IdMotivo') IS NULL
    ALTER TABLE dbo.Clientes ADD IdMotivo INT NULL;
GO
IF COL_LENGTH('dbo.Clientes', 'MotivoDetalle') IS NULL
    ALTER TABLE dbo.Clientes ADD MotivoDetalle VARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.Clientes', 'IdCalificacion') IS NULL
    ALTER TABLE dbo.Clientes ADD IdCalificacion INT NULL;
GO
IF COL_LENGTH('dbo.Clientes', 'IdLocalidad') IS NULL
    ALTER TABLE dbo.Clientes ADD IdLocalidad INT NULL;
GO
IF COL_LENGTH('dbo.Clientes', 'IdPartido') IS NULL
    ALTER TABLE dbo.Clientes ADD IdPartido INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Clientes_ClientesEstados')
    ALTER TABLE dbo.Clientes ADD CONSTRAINT FK_Clientes_ClientesEstados
        FOREIGN KEY (IdEstado) REFERENCES dbo.ClientesEstados(Id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Clientes_ClientesMotivos')
    ALTER TABLE dbo.Clientes ADD CONSTRAINT FK_Clientes_ClientesMotivos
        FOREIGN KEY (IdMotivo) REFERENCES dbo.ClientesMotivos(Id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Clientes_ClientesCalificaciones')
    ALTER TABLE dbo.Clientes ADD CONSTRAINT FK_Clientes_ClientesCalificaciones
        FOREIGN KEY (IdCalificacion) REFERENCES dbo.ClientesCalificaciones(Id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Clientes_Localidades')
    ALTER TABLE dbo.Clientes ADD CONSTRAINT FK_Clientes_Localidades
        FOREIGN KEY (IdLocalidad) REFERENCES dbo.Localidades(Id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Clientes_Partidos')
    ALTER TABLE dbo.Clientes ADD CONSTRAINT FK_Clientes_Partidos
        FOREIGN KEY (IdPartido) REFERENCES dbo.Partidos(Id);
GO

UPDATE dbo.Clientes SET IdEstado = (SELECT TOP 1 Id FROM dbo.ClientesEstados WHERE Nombre = 'Activo')
WHERE IdEstado IS NULL AND Activo = 1;
UPDATE dbo.Clientes SET IdEstado = (SELECT TOP 1 Id FROM dbo.ClientesEstados WHERE Nombre = 'Inactivo')
WHERE IdEstado IS NULL AND Activo = 0;
GO

/* ============================================================
   CAMIONES
   ============================================================ */
IF OBJECT_ID(N'dbo.Camiones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Camiones (
        Id                    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre                VARCHAR(120) NOT NULL,
        Activo                BIT NOT NULL CONSTRAINT DF_Camiones_Activo DEFAULT (1),
        IdUsuarioRegistra     INT NOT NULL,
        FechaUsuarioRegistra  DATETIME NOT NULL,
        IdUsuarioModifica     INT NULL,
        FechaUsuarioModifica  DATETIME NULL,
        CONSTRAINT FK_Camiones_Usuarios_Registra FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_Camiones_Usuarios_Modifica FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
END
GO

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdCamion') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdCamion INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEstablecimientos_Camiones')
    ALTER TABLE dbo.ClientesEstablecimientos ADD CONSTRAINT FK_ClientesEstablecimientos_Camiones
        FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id);
GO

IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdLocalidad') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdLocalidad INT NULL;
GO
IF COL_LENGTH('dbo.ClientesEstablecimientos', 'IdPartido') IS NULL
    ALTER TABLE dbo.ClientesEstablecimientos ADD IdPartido INT NULL;
GO

IF COL_LENGTH('dbo.ClientesEntregas', 'IdCamion') IS NULL
    ALTER TABLE dbo.ClientesEntregas ADD IdCamion INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ClientesEntregas_Camiones')
    ALTER TABLE dbo.ClientesEntregas ADD CONSTRAINT FK_ClientesEntregas_Camiones
        FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id);
GO

PRINT '001_ModuloClientesGeoCamiones.sql ejecutado correctamente.';
GO
