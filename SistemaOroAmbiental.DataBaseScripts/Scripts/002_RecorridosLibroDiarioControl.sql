/*
  002 — Recorridos, asignación clientes, control mensual, libro diario, campos cliente.
  Ejecutar en SistemaDB después de 001. Idempotente donde es posible.
*/

SET NOCOUNT ON;
GO

/* ============================================================
   CLIENTES — número, fechas inicio/licencia
   ============================================================ */
IF COL_LENGTH('dbo.Clientes', 'NumeroCliente') IS NULL
    ALTER TABLE dbo.Clientes ADD NumeroCliente INT NULL;
GO

IF COL_LENGTH('dbo.Clientes', 'FechaInicio') IS NULL
    ALTER TABLE dbo.Clientes ADD FechaInicio DATE NULL;
GO

IF COL_LENGTH('dbo.Clientes', 'FechaLicenciaDesde') IS NULL
    ALTER TABLE dbo.Clientes ADD FechaLicenciaDesde DATE NULL;
GO

IF COL_LENGTH('dbo.Clientes', 'FechaLicenciaHasta') IS NULL
    ALTER TABLE dbo.Clientes ADD FechaLicenciaHasta DATE NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Clientes_NumeroCliente' AND object_id = OBJECT_ID('dbo.Clientes'))
    CREATE UNIQUE INDEX IX_Clientes_NumeroCliente ON dbo.Clientes(NumeroCliente) WHERE NumeroCliente IS NOT NULL;
GO

/* ============================================================
   RECORRIDOS MATRIZ — zona por unidad/semana/día
   ============================================================ */
IF OBJECT_ID(N'dbo.RecorridosMatriz', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecorridosMatriz (
        Id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCamion            INT NOT NULL,
        IdSemana            INT NOT NULL,
        IdDia               INT NOT NULL,
        Zona                VARCHAR(120) NOT NULL,
        IdUsuarioRegistra   INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica   INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT UQ_RecorridosMatriz UNIQUE (IdCamion, IdSemana, IdDia),
        CONSTRAINT FK_RecorridosMatriz_Camiones FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id),
        CONSTRAINT FK_RecorridosMatriz_Semanas FOREIGN KEY (IdSemana) REFERENCES dbo.Semanas(Id),
        CONSTRAINT FK_RecorridosMatriz_Dias FOREIGN KEY (IdDia) REFERENCES dbo.Dias(Id),
        CONSTRAINT FK_RecorridosMatriz_UsuReg FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_RecorridosMatriz_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
    CREATE INDEX IX_RecorridosMatriz_Camion ON dbo.RecorridosMatriz(IdCamion);
END
GO

/* ============================================================
   CLIENTES RECORRIDOS — posición en ruta (múltiples por cliente)
   ============================================================ */
IF OBJECT_ID(N'dbo.ClientesRecorridos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesRecorridos (
        Id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCliente           INT NOT NULL,
        IdEstablecimiento   INT NULL,
        IdCamion            INT NOT NULL,
        IdSemana            INT NOT NULL,
        IdDia               INT NOT NULL,
        Posicion            INT NOT NULL,
        Activo              BIT NOT NULL CONSTRAINT DF_ClientesRecorridos_Activo DEFAULT(1),
        IdUsuarioRegistra   INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica   INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT FK_ClientesRecorridos_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes(Id),
        CONSTRAINT FK_ClientesRecorridos_Establecimientos FOREIGN KEY (IdEstablecimiento) REFERENCES dbo.ClientesEstablecimientos(Id),
        CONSTRAINT FK_ClientesRecorridos_Camiones FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id),
        CONSTRAINT FK_ClientesRecorridos_Semanas FOREIGN KEY (IdSemana) REFERENCES dbo.Semanas(Id),
        CONSTRAINT FK_ClientesRecorridos_Dias FOREIGN KEY (IdDia) REFERENCES dbo.Dias(Id),
        CONSTRAINT FK_ClientesRecorridos_UsuReg FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_ClientesRecorridos_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
    CREATE INDEX IX_ClientesRecorridos_Cliente ON dbo.ClientesRecorridos(IdCliente);
    CREATE INDEX IX_ClientesRecorridos_Ruta ON dbo.ClientesRecorridos(IdCamion, IdSemana, IdDia);
END
GO

/* ============================================================
   CONTROL MENSUAL — observaciones / cajas a favor (complementa entregas)
   ============================================================ */
IF OBJECT_ID(N'dbo.ClientesControlMensual', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientesControlMensual (
        Id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdCliente           INT NOT NULL,
        Anio                INT NOT NULL,
        Mes                 INT NOT NULL,
        FechaVisita         DATE NULL,
        SinEntrega          BIT NOT NULL CONSTRAINT DF_ClientesControlMensual_SinEntrega DEFAULT(0),
        CajasAFavor         INT NOT NULL CONSTRAINT DF_ClientesControlMensual_CajasAFavor DEFAULT(0),
        Observaciones       VARCHAR(500) NULL,
        AbonoEfectivo       DECIMAL(18,2) NOT NULL CONSTRAINT DF_ClientesControlMensual_AbonoEfectivo DEFAULT(0),
        AbonoTransferencia  DECIMAL(18,2) NOT NULL CONSTRAINT DF_ClientesControlMensual_AbonoTransferencia DEFAULT(0),
        FechaTransferencia  DATE NULL,
        IdUsuarioRegistra   INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica   INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT UQ_ClientesControlMensual UNIQUE (IdCliente, Anio, Mes),
        CONSTRAINT FK_ClientesControlMensual_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes(Id),
        CONSTRAINT FK_ClientesControlMensual_UsuReg FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_ClientesControlMensual_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
END
GO

/* ============================================================
   LIBRO DIARIO — conceptos preset
   ============================================================ */
IF OBJECT_ID(N'dbo.LibroDiarioConceptos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LibroDiarioConceptos (
        Id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Nombre              VARCHAR(120) NOT NULL,
        PrecioUnitario      DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioConceptos_Precio DEFAULT(0),
        IdProducto          INT NULL,
        AfectaInventario    BIT NOT NULL CONSTRAINT DF_LibroDiarioConceptos_AfectaInv DEFAULT(0),
        TipoStock           VARCHAR(20) NULL,
        Activo              BIT NOT NULL CONSTRAINT DF_LibroDiarioConceptos_Activo DEFAULT(1),
        IdUsuarioRegistra   INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica   INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT FK_LibroDiarioConceptos_Productos FOREIGN KEY (IdProducto) REFERENCES dbo.Productos(Id),
        CONSTRAINT FK_LibroDiarioConceptos_UsuReg FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_LibroDiarioConceptos_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.LibroDiarioConceptos)
BEGIN
    DECLARE @IdUsuarioSistema INT = (SELECT TOP 1 Id FROM dbo.Usuarios ORDER BY Id);

    IF @IdUsuarioSistema IS NOT NULL
    BEGIN
        INSERT INTO dbo.LibroDiarioConceptos (Nombre, PrecioUnitario, AfectaInventario, TipoStock, Activo, IdUsuarioRegistra, FechaUsuarioRegistra)
        VALUES
            ('CAJA CHICA 5 KG', 500, 1, 'ENTREGA', 1, @IdUsuarioSistema, GETDATE()),
            ('CAJA CONVENCIONAL 5 KG', 1000, 1, 'ENTREGA', 1, @IdUsuarioSistema, GETDATE()),
            ('RETIRO COBRADO', 0, 0, 'RETIRO', 1, @IdUsuarioSistema, GETDATE()),
            ('RECUPERO CAJA', 0, 1, 'RECUPERO', 1, @IdUsuarioSistema, GETDATE());
    END
    ELSE
        PRINT 'AVISO: LibroDiarioConceptos sin datos iniciales — no hay usuarios en dbo.Usuarios.';
END
GO

/* ============================================================
   LIBRO DIARIO — movimientos
   ============================================================ */
IF OBJECT_ID(N'dbo.LibroDiarioMovimientos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LibroDiarioMovimientos (
        Id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Fecha               DATETIME NOT NULL,
        IdConcepto          INT NULL,
        Concepto            VARCHAR(200) NOT NULL,
        IdCliente           INT NULL,
        IdProveedor         INT NULL,
        RecorridoTexto      VARCHAR(120) NULL,
        IdCamion            INT NULL,
        IdSemana            INT NULL,
        IdDia               INT NULL,
        Unidades            DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Unidades DEFAULT(0),
        PrecioUnitario      DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Precio DEFAULT(0),
        Debe                DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Debe DEFAULT(0),
        Haber               DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Haber DEFAULT(0),
        PorcIva             DECIMAL(5,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_PorcIva DEFAULT(0),
        Iva                 DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Iva DEFAULT(0),
        OtrosImp            DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_OtrosImp DEFAULT(0),
        Total               DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Total DEFAULT(0),
        Saldo               DECIMAL(18,2) NOT NULL CONSTRAINT DF_LibroDiarioMov_Saldo DEFAULT(0),
        FormaPago           VARCHAR(30) NULL,
        EsBancario          BIT NOT NULL CONSTRAINT DF_LibroDiarioMov_EsBancario DEFAULT(0),
        IdProducto          INT NULL,
        TipoStock           VARCHAR(20) NULL,
        IdUsuarioRegistra   INT NOT NULL,
        FechaUsuarioRegistra DATETIME NOT NULL,
        IdUsuarioModifica   INT NULL,
        FechaUsuarioModifica DATETIME NULL,
        CONSTRAINT FK_LibroDiarioMov_Conceptos FOREIGN KEY (IdConcepto) REFERENCES dbo.LibroDiarioConceptos(Id),
        CONSTRAINT FK_LibroDiarioMov_Clientes FOREIGN KEY (IdCliente) REFERENCES dbo.Clientes(Id),
        CONSTRAINT FK_LibroDiarioMov_Proveedores FOREIGN KEY (IdProveedor) REFERENCES dbo.Proveedores(Id),
        CONSTRAINT FK_LibroDiarioMov_Camiones FOREIGN KEY (IdCamion) REFERENCES dbo.Camiones(Id),
        CONSTRAINT FK_LibroDiarioMov_Semanas FOREIGN KEY (IdSemana) REFERENCES dbo.Semanas(Id),
        CONSTRAINT FK_LibroDiarioMov_Dias FOREIGN KEY (IdDia) REFERENCES dbo.Dias(Id),
        CONSTRAINT FK_LibroDiarioMov_Productos FOREIGN KEY (IdProducto) REFERENCES dbo.Productos(Id),
        CONSTRAINT FK_LibroDiarioMov_UsuReg FOREIGN KEY (IdUsuarioRegistra) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_LibroDiarioMov_UsuMod FOREIGN KEY (IdUsuarioModifica) REFERENCES dbo.Usuarios(Id)
    );
    CREATE INDEX IX_LibroDiarioMov_Fecha ON dbo.LibroDiarioMovimientos(Fecha);
    CREATE INDEX IX_LibroDiarioMov_Cliente ON dbo.LibroDiarioMovimientos(IdCliente);
    CREATE INDEX IX_LibroDiarioMov_Bancario ON dbo.LibroDiarioMovimientos(EsBancario);
END
GO

PRINT '002_RecorridosLibroDiarioControl.sql ejecutado.';
GO
