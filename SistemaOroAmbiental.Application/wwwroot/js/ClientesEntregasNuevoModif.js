/* =========================================================
   ENTREGAS NUEVO/MODIF  estilo VentasNuevoModif (Levels)
   Build: lineas-completas + importe-tras-cuenta
========================================================= */
window.__OA_ENTREGA_BUILD = "precio-entrega-lista-20260811";

(function () {
    "use strict";

    const CM = {
        init: window.CM_INIT || { id: 0, idCliente: 0 },
        id: 0,
        soloLectura: false,
        cargandoEntrega: false,
        clientes: [],
        estadosEntrega: [],
        sucursales: [],
        idSucursalCliente: 0,
        productos: [],
        listasPrecios: [],
        preciosCache: {},
        productosEstablecimiento: [],
        lineas: [],
        nextLineId: 1,
        cobrosLineas: [],
        cobrosResumen: null,
        cuentasCaja: [],
        nextCobroKey: 1,
        establecimientos: [],
        contratos: [],
        idEstablecimientoSel: 0
    };

    const API = {
        editarInfo: id => `/ClientesEntregas/EditarInfo?id=${id}`,
        insertar: "/ClientesEntregas/Insertar",
        actualizar: "/ClientesEntregas/Actualizar",
        eliminar: id => `/ClientesEntregas/Eliminar?id=${id}`,
        cobros: id => `/ClientesEntregas/Cobros?id=${id}`,
        clientes: "/Clientes/Lista?soloActivos=true",
        clienteInfo: id => `/Clientes/EditarInfo?id=${id}`,
        productos: "/Productos/Lista",
        listasPrecios: "/ListasPrecios/Lista",
        preciosProducto: id => `/ProductosPrecios/ListaPorProducto?idProducto=${id}`,
        productosEstablecimiento: id => `/ClientesEstablecimientosProductos/ListaPorEstablecimiento?idEstablecimiento=${id}`,
        estadosEntrega: "/EntregasEstados/Lista",
        camiones: "/Camiones/Lista?soloActivos=true",
        sucursales: "/Sucursales/Lista",
        cuentas: "/Cuentas/Lista",
        establecimientosPorCliente: id => `/ClientesEstablecimientos/ListaPorCliente?idCliente=${id}`,
        contratosPorCliente: id => `/Contratos/Lista?idCliente=${id}`
    };

    const TIPO_LINEA_ENTREGA = 1;
    const TIPO_LINEA_RETIRO = 2;
    const TIPO_LINEA_RECUPERADO = 3;

    const authHeaders = () => ({
        Authorization: "Bearer " + (token || ""),
        "Content-Type": "application/json"
    });

    function leerNum(val) {
        if (typeof leerInputNumerico === "function") return leerInputNumerico(val);
        if (typeof parseNumero === "function") return parseNumero(val);
        const n = parseFloat(String(val ?? "").replace(/\./g, "").replace(",", "."));
        return isNaN(n) ? 0 : n;
    }

    function fmtInputNum(n) {
        const num = Number(n ?? 0);
        if (isNaN(num)) return "";
        const s = String(num).replace(".", ",");
        return typeof formatearMiles === "function" ? formatearMiles(s) : s;
    }

    function prepararInputsMilesLinea($scope) {
        ($scope || $("#tbodyLineasEntrega, #tbodyLineasRecuperados")).find(".linea-cant, .linea-precio, .linea-desc, .linea-iva").each(function () {
            if (typeof prepararInputMiles === "function") {
                prepararInputMiles(this);
            } else {
                this.classList.add("Inputmiles");
                if (this.type === "number") this.type = "text";
            }
            if (this.value && typeof formatearMilesInput === "function") {
                formatearMilesInput(this);
            }
        });
    }

    function setValorInputMiles($input, valor) {
        if (!$input?.length) return;
        if (typeof prepararInputMiles === "function") {
            prepararInputMiles($input[0]);
        }
        $input.val(fmtInputNum(valor));
        if ($input[0].value && typeof formatearMilesInput === "function") {
            formatearMilesInput($input[0]);
        }
    }

    function resolverIdEntregaInicial() {
        // 1) CM_INIT del servidor  2) hidden  3) querystring (fuente de verdad del link "Abrir entrega")
        const fromInit = Number(window.CM_INIT?.id ?? CM.init?.id ?? 0);
        if (fromInit > 0) return fromInit;
        const fromHidden = Number(document.getElementById("Entrega_Id")?.value || 0);
        if (fromHidden > 0) return fromHidden;
        try {
            return Number(new URLSearchParams(window.location.search).get("id") || 0) || 0;
        } catch {
            return 0;
        }
    }

    function resolverIdClienteInicial() {
        const fromInit = Number(window.CM_INIT?.idCliente ?? CM.init?.idCliente ?? 0);
        if (fromInit > 0) return fromInit;
        try {
            return Number(new URLSearchParams(window.location.search).get("idCliente") || 0) || 0;
        } catch {
            return 0;
        }
    }

    $(document).ready(async () => {
        CM.init = Object.assign({}, CM.init, window.CM_INIT || {});
        CM.id = resolverIdEntregaInicial();
        if (!(Number(CM.init.idCliente) > 0)) {
            CM.init.idCliente = resolverIdClienteInicial();
        }

        initTabsEntrega();
        wireEventosEntrega();
        initModalesAtajos();
        initAtajosConfiguracionEntrega();

        try {
            await cargarCombosEntrega();
            await cargarCuentasCajaEntrega();

            if (CM.id > 0) {
                await cargarEntrega(CM.id);
            } else {
                setModoNuevo();
                if (CM.init.idCliente) {
                    const idCli = Number(CM.init.idCliente || 0);
                    $("#cCliente").val(String(idCli)).trigger("change.select2");
                    const cli = (CM.clientes || []).find(x => Number(x.Id) === idCli);
                    CM.idSucursalCliente = cli ? Number(cli.IdSucursal || 0) : 0;
                    if (idCli > 0) await cargarEstablecimientosEntrega(idCli);
                }
                CM.lineas = [];
                CM.cobrosLineas = [];
                renderLineas();
                renderCobrosLineas();
                actualizarResumenCobrosUI();
            }
        } catch (e) {
            console.error("Error inicializando entrega:", e);
            if (typeof errorModal === "function") {
                errorModal("No se pudo cargar la entrega. Revisá la consola o reintentá.");
            }
        }
    });

    function esLineaRecuperada(linea) {
        return Number(linea?.TipoMovimiento) === TIPO_LINEA_RECUPERADO;
    }

    function lineasProductosOperacion() {
        return (CM.lineas || []).filter(l => !esLineaRecuperada(l));
    }

    function lineasRecuperadas() {
        return (CM.lineas || []).filter(esLineaRecuperada);
    }

    /** Productos / cobros vacios: cartel visible + animacion en botones agregar */
    function actualizarUIEstadoVaciosEntrega() {
        const productosOp = lineasProductosOperacion();
        const recuperados = lineasRecuperadas();
        const sinProductos = productosOp.length === 0;
        const sinRecuperados = recuperados.length === 0;
        const sinCobros = (CM.cobrosLineas || []).length === 0;
        const lectura = !!CM.soloLectura;

        $("#lblSinLineas").prop("hidden", !sinProductos);
        $("#tblLineasEntrega").toggleClass("d-none", sinProductos);

        $("#lblSinRecuperados").prop("hidden", !sinRecuperados);
        $("#tblLineasRecuperados").toggleClass("d-none", sinRecuperados);

        $("#lblSinCobros").prop("hidden", !sinCobros);
        $("#tblCobrosEntrega").closest(".vn-gridtable").toggleClass("d-none", sinCobros);
        $("#lblCobrosHint").toggleClass("d-none", sinCobros);

        $("#wrapAgregarLinea").toggleClass("vn-agregar-wrap--pulse", sinProductos && !lectura);
        $("#wrapAgregarRecuperado").toggleClass("vn-agregar-wrap--pulse", sinRecuperados && !lectura);
        $("#wrapAgregarCobro").toggleClass("vn-agregar-wrap--pulse", sinCobros && !lectura);

        $("#cntProductos").text(`(${productosOp.length})`);
        $("#cntRecuperados").text(`(${recuperados.length})`);
        $("#cntCobros").text(`(${CM.cobrosLineas.length})`);

        actualizarBotonesAgregarLinea();
    }

    function initTabsEntrega() {
        // Vista unica: todas las secciones visibles; sin solapas.
        $(".vn-section").addClass("active");
    }

    function wireEventosEntrega() {
    $("#btnGuardarEntrega").on("click", busyHandler(guardarEntrega));
        $("#btnEliminarEntrega").on("click", eliminarEntregaActual);
        $("#btnAgregarLinea").on("click", () => agregarLinea({ TipoMovimiento: TIPO_LINEA_ENTREGA }));
        $("#btnAgregarRecuperado").on("click", () => agregarLinea({ TipoMovimiento: TIPO_LINEA_RECUPERADO }));

        $("#btnCrearProducto").on("click", () => {
            window.nuevoProducto?.();
        });

        $("#btnAgregarCobroEntrega").on("click", () => agregarCobroLinea());

        // Red de seguridad: sin cuenta no se puede tipear importe
        if (!window.__oaBloqueoImporteEntrega) {
            window.__oaBloqueoImporteEntrega = true;
            const sel = "#tbodyCobrosEntrega .cobro-importe";
            const cuentaOk = (el) => {
                const tr = el?.closest?.("tr");
                if (!tr) return false;
                return (parseInt(tr.querySelector(".cobro-cuenta")?.value || "0", 10) || 0) > 0;
            };
            document.addEventListener("focusin", (e) => {
                const el = e.target?.closest?.(sel);
                if (!el || cuentaOk(el)) return;
                el.blur();
                el.value = "";
                e.stopImmediatePropagation();
            }, true);
            document.addEventListener("keydown", (e) => {
                const el = e.target?.closest?.(sel);
                if (!el || cuentaOk(el)) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                el.value = "";
            }, true);
            document.addEventListener("input", (e) => {
                const el = e.target?.closest?.(sel);
                if (!el || cuentaOk(el)) return;
                el.value = "";
                e.stopImmediatePropagation();
            }, true);
        }
    }

    window.cerrarErrorEntrega = function () {
        $("#errorCamposEntrega").addClass("d-none");
        limpiarMarcasErrorSeccionesEntrega();
    };

    function limpiarMarcasErrorSeccionesEntrega() {
        $(".vn-section-block").removeClass("has-error");
        $(".vn-head-btn").removeClass("error");
    }

    function marcarSeccionesErrorEntrega(secciones) {
        limpiarMarcasErrorSeccionesEntrega();
        if (!secciones) return;

        if (secciones.datos) {
            $("#sec-datos").addClass("has-error");
            $('.vn-head-btn[data-sec="datos"]').addClass("error");
        }
        if (secciones.productos) {
            $("#sec-productos").addClass("has-error");
            $('.vn-head-btn[data-sec="productos"]').addClass("error");
        }
        if (secciones.recuperados) {
            $("#sec-recuperados").addClass("has-error");
            $('.vn-head-btn[data-sec="recuperados"]').addClass("error");
        }
        if (secciones.cobros) {
            $("#sec-cobros").addClass("has-error");
            $('.vn-head-btn[data-sec="cobros"]').addClass("error");
        }

        const primera = secciones.datos ? "#sec-datos"
            : secciones.productos ? "#sec-productos"
            : secciones.recuperados ? "#sec-recuperados"
            : secciones.cobros ? "#sec-cobros"
            : null;
        if (primera) {
            document.querySelector(primera)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function activarTabEntrega(sec) {
        // Compat: en vista unica solo scrollea a la seccion.
        const el = document.getElementById(`sec-${sec}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function inferirSeccionesErrorEntrega(mensaje) {
        const m = String(mensaje || "").toLowerCase();
        const secciones = { datos: false, productos: false, recuperados: false };

        const clavesDatos = ["contrato", "estado", "fecha", "nota"];
        const clavesCobros = ["cobro", "cobros", "cuenta", "caja"];
        const clavesProductos = ["producto", "linea", "linea", "cantidad", "costo", "item", "item", "lineas", "lineas"];
        const clavesRecuperados = ["recuperado", "recuperados"];

        clavesDatos.forEach(k => { if (m.includes(k)) secciones.datos = true; });
        clavesRecuperados.forEach(k => { if (m.includes(k)) secciones.recuperados = true; });
        clavesProductos.forEach(k => { if (m.includes(k)) secciones.productos = true; });
        clavesCobros.forEach(k => { if (m.includes(k)) secciones.cobros = true; });

        return secciones;
    }

    function cobrosActivos() {
        return (CM.cobrosLineas || []).filter(p => Number(p.Importe) > 0 || p.IdCobro > 0);
    }

    /** Cobros que se envian al guardar (importe > 0 y cuenta de caja). */
    function cobrosParaGuardar() {
        sincronizarCobrosDesdeDom();
        return (CM.cobrosLineas || []).filter(p =>
            Number(p.Importe) > 0 && Number(p.IdCuenta) > 0
        );
    }

    function validarCobrosLocal() {
        sincronizarCobrosDesdeDom();

        const conImporte = (CM.cobrosLineas || []).filter(p => Number(p.Importe) > 0);
        const paraGuardar = cobrosParaGuardar();

        if (conImporte.length > 0 && paraGuardar.length < conImporte.length) {
            return {
                ok: false,
                mensaje: "Revise los cobros: cada fila con importe debe tener sucursal y cuenta de caja seleccionadas."
            };
        }

        if (!paraGuardar.length) {
            return { ok: true, mensaje: "" };
        }

        // Se permite cobrar de más: el exceso queda como saldo a favor en CC.
        for (const p of paraGuardar) {
            if (!p.Fecha || !p.IdSucursal || !p.IdCuenta || !(p.Concepto || "").trim() || p.Importe <= 0) {
                return { ok: false, mensaje: "Revise los cobros: fecha, sucursal, cuenta, concepto e importe son obligatorios." };
            }
        }

        return { ok: true, mensaje: "" };
    }

    function sincronizarCobrosDesdeDom() {
        $("#tbodyCobrosEntrega tr").each(function () {
            const key = Number($(this).data("key"));
            const cobro = CM.cobrosLineas.find(x => x._key === key);
            if (cobro) syncCobroFromRow($(this), cobro);
        });
    }

    function sincronizarLineasDesdeDom() {
        $("#tbodyLineasEntrega .en-linea, #tbodyLineasRecuperados .en-linea").each(function () {
            const key = Number($(this).data("key"));
            const linea = CM.lineas.find(x => x._key === key);
            if (linea) syncLineaFromRow($(this), linea);
        });
    }

    function validarEntregaLocal() {
        sincronizarLineasDesdeDom();
        actualizarAlertaDuplicadosLineasEntrega();

        const erroresDatos = [];
        const erroresProductos = [];

        if (!$("#cFecha").val()) {
            erroresDatos.push("Indique la fecha de la entrega.");
        }
        if (!(parseInt($("#cCliente").val(), 10) > 0)) {
            erroresDatos.push("Seleccione un cliente.");
        }

        const idEst = parseInt($("#cEstablecimiento").val(), 10) || 0;
        if (idEst <= 0) {
            erroresDatos.push("Seleccione el establecimiento de la entrega.");
        }

        const lineasConProducto = CM.lineas.filter(l => l.IdProducto > 0);

        if (lineasConProducto.length === 0) {
            erroresProductos.push("Agregue al menos un producto entregado o recuperado.");
        } else {
            const sinProducto = CM.lineas.some(l => !l.IdProducto);
            if (sinProducto) {
                erroresProductos.push("Hay lineas sin producto seleccionado.");
            }

            const cantidadInvalida = CM.lineas.some(l => l.IdProducto > 0 && !(Number(l.Cantidad) > 0));
            if (cantidadInvalida) {
                erroresProductos.push("Las cantidades deben ser mayores a cero.");
            }

            const sinListaRetiro = CM.lineas.some(l =>
                l.IdProducto > 0
                && Number(l.TipoMovimiento) === TIPO_LINEA_RETIRO
                && !(Number(l.IdListaPrecio) > 0));
            if (sinListaRetiro) {
                erroresProductos.push("Seleccioná la lista / tipo de pago en las líneas de retiro.");
            }

            const clavesOp = new Set();
            const clavesRec = new Set();
            let dupOperacion = false;
            let dupRecuperado = false;
            for (const l of lineasConProducto) {
                const clave = claveUnicaLineaProducto(l);
                if (esLineaRecuperada(l)) {
                    if (clavesRec.has(clave)) dupRecuperado = true;
                    else clavesRec.add(clave);
                } else if (clavesOp.has(clave)) {
                    dupOperacion = true;
                } else {
                    clavesOp.add(clave);
                }
            }
            if (dupOperacion) {
                erroresProductos.push("No podés repetir una línea 100% igual (producto, tipo, lista, cantidad, precio, desc. e IVA). Si cambia algún dato, sí se permite.");
            }
            if (dupRecuperado) {
                erroresProductos.push("No podés repetir una línea recuperada 100% igual. Si cambia algún dato, sí se permite.");
            }

            const costoInvalido = CM.lineas.some(l => l.IdProducto > 0 && Number(l.PrecioVenta) < 0);
            if (costoInvalido) {
                erroresProductos.push("El precio de venta no puede ser negativo.");
            }
        }

        const mensajes = [...erroresDatos, ...erroresProductos];
        const secciones = {
            datos: erroresDatos.length > 0,
            productos: erroresProductos.length > 0,
            recuperados: erroresProductos.length > 0
        };

        return {
            ok: mensajes.length === 0,
            mensaje: mensajes.join(" "),
            secciones
        };
    }

    function mostrarErrorEntrega(msg, secciones) {
        const texto = msg || "Revise los datos ingresados.";
        const $p = $("#errorCamposEntrega");
        $p.find(".rp-error-message").text(texto);
        $p.removeClass("d-none");

        const flags = secciones || inferirSeccionesErrorEntrega(texto);
        if (flags.datos || flags.productos || flags.recuperados) {
            marcarSeccionesErrorEntrega(flags);
        } else {
            limpiarMarcasErrorSeccionesEntrega();
        }

        if ($p.offset()) {
            $("html, body").animate({ scrollTop: $p.offset().top - 80 }, 200);
        }
        if (typeof errorModal === "function") {
            errorModal(texto);
        }
    }

    function initAtajosConfiguracionEntrega() {
        if (window._entregaConfigListenerInit) return;
        window._entregaConfigListenerInit = true;

        document.addEventListener("configuracionActualizada", async (e) => {
            const ctrl = e.detail?.tipo || "";
            const nuevoId = e.detail?.nuevoId;

            if (ctrl === "EntregasEstados") {
                const prev = $("#cEstado").val();
                await cargarEstadoesEntrega();
                const idSel = nuevoId || prev;
                if (idSel) $("#cEstado").val(String(idSel)).trigger("change.select2");
                return;
            }

            if (ctrl === "Cuentas" || ctrl === "Sucursales") {
                if (ctrl === "Sucursales") await cargarSucursalesEntrega();
                await cargarCuentasCajaEntrega();

                const btn = window._rpUltimoAtajoConfigBtn;
                const $row = btn ? $(btn).closest("tr[data-key]") : null;
                const key = $row?.length ? parseInt($row.data("key"), 10) : 0;
                const cobro = key ? CM.cobrosLineas.find(x => x._key === key) : null;

                if (ctrl === "Cuentas" && cobro && nuevoId) {
                    cobro.IdCuenta = Number(nuevoId);
                }

                renderCobrosLineas();
                actualizarResumenCobrosUI();
            }
        });
    }

    function initModalesAtajos() {
        if (typeof initProductoModal === "function") {
            initProductoModal({
                token: token,
                onSaved: async (data) => {
                    await cargarProductosEntrega();
                    const id = data?.id ?? data?.Id;
                    if (id) {
                        const last = CM.lineas[CM.lineas.length - 1];
                        if (last) {
                            renderLineas();
                            const $sel = $(`#linea_${last._key}_producto`);
                            if ($sel.length) $sel.val(String(id)).trigger("change.select2");
                        }
                    }
                }
            });
        }
    }

    async function cargarCombosEntrega() {
        await Promise.all([
            cargarClientesEntrega(),
            cargarEstadoesEntrega(),
            cargarCamionesEntrega(),
            cargarSucursalesEntrega(),
            cargarProductosEntrega(),
            cargarListasPreciosEntrega()
        ]);

        initSelectClienteHeader();
        ensureSelect2Cm($("#cEstado"), { placeholder: "Seleccionar estado" });
        ensureSelect2Cm($("#cCamion"), { placeholder: "Seleccionar camion", allowClear: true });
        ensureSelect2Cm($("#cEstablecimiento"), { placeholder: "Seleccionar establecimiento", allowClear: true });

        $("#cCliente").off("change.entregaSuc").on("change.entregaSuc", async function () {
            if (CM.cargandoEntrega) return;
            const id = parseInt($(this).val(), 10) || 0;
            const c = (CM.clientes || []).find(x => Number(x.Id) === id);
            CM.idSucursalCliente = c ? Number(c.IdSucursal || 0) : 0;
            await cargarEstablecimientosEntrega(id);
        });

        $("#cEstablecimiento").off("change.entregaProdEst").on("change.entregaProdEst", async function () {
            if (CM.cargandoEntrega) return;
            const idEst = parseInt($(this).val(), 10) || 0;
            CM.idEstablecimientoSel = idEst;
            await cargarProductosEstablecimientoEntrega(idEst);
        });
    }

    async function cargarEstablecimientosEntrega(idCliente, idEstablecimientoPreferido) {
        const idCli = Number(idCliente || 0);
        const preferido = Number(idEstablecimientoPreferido || 0);
        CM.establecimientos = [];
        CM.contratos = [];
        CM.idEstablecimientoSel = 0;

        const $sel = $("#cEstablecimiento");
        $sel.empty().append(`<option value="">Seleccionar establecimiento</option>`);

        if (idCli <= 0) {
            $sel.val("").trigger("change.select2");
            return;
        }

        try {
            const rEst = await fetch(API.establecimientosPorCliente(idCli), { headers: authHeaders() });
            CM.establecimientos = rEst.ok ? await rEst.json() : [];
            CM.contratos = [];
        } catch {
            CM.establecimientos = [];
            CM.contratos = [];
        }

        (CM.establecimientos || []).forEach(e => {
            const id = Number(e.Id || e.id || 0);
            if (id <= 0) return;
            const nom = e.Nombre || e.nombre || `Est. #${id}`;
            $sel.append(`<option value="${id}">${nom}</option>`);
        });

        let idSel = preferido;
        if (!(idSel > 0) || !$sel.find(`option[value="${idSel}"]`).length) {
            const ids = (CM.establecimientos || [])
                .map(e => Number(e.Id || e.id || 0))
                .filter(id => id > 0);
            idSel = ids.length === 1 ? ids[0] : 0;
        }

        CM.idEstablecimientoSel = idSel;
        $sel.val(idSel > 0 ? String(idSel) : "").trigger("change.select2");
        await cargarProductosEstablecimientoEntrega(idSel);
    }

    async function cargarProductosEstablecimientoEntrega(idEstablecimiento) {
        const id = Number(idEstablecimiento || 0);
        CM.productosEstablecimiento = [];
        if (id <= 0) return;
        try {
            const r = await fetch(API.productosEstablecimiento(id), { headers: authHeaders() });
            CM.productosEstablecimiento = r.ok ? (await r.json()) || [] : [];
        } catch (e) {
            console.warn(e);
            CM.productosEstablecimiento = [];
        }
    }

    async function cargarSucursalesEntrega() {
        CM.sucursales = typeof fetchSucursalesPermitidas === "function"
            ? await fetchSucursalesPermitidas(API.sucursales)
            : await (await fetch(API.sucursales, { headers: authHeaders() })).json();
    }

    /**
     * Carga clientes activos para el combo.
     * @param {number} [idClienteIncluir] Si la entrega ya tiene un cliente inactivo asignado, se incluye solo ese.
     */
    async function cargarClientesEntrega(idClienteIncluir) {
        const incluir = Number(idClienteIncluir || 0);
        const r = await fetch(API.clientes, { headers: authHeaders() });
        CM.clientes = r.ok ? await r.json() : [];

        if (incluir > 0 && !(CM.clientes || []).some(x => Number(x.Id) === incluir)) {
            const rCli = await fetch(API.clienteInfo(incluir), { headers: authHeaders() });
            if (rCli.ok) {
                const cli = await rCli.json();
                CM.clientes.push({
                    Id: cli.Id,
                    Nombre: cli.Nombre,
                    IdSucursal: cli.IdSucursal,
                    Activo: cli.Activo !== false
                });
            }
        }

        const idSel = incluir > 0
            ? incluir
            : (parseInt($("#cCliente").val(), 10) || 0);
        llenarSelectClientesEntrega(idSel);
    }

    function llenarSelectClientesEntrega(idClienteSeleccionado) {
        const $p = $("#cCliente");
        const idSel = Number(idClienteSeleccionado || parseInt($p.val(), 10) || 0);

        $p.empty().append(`<option value="">Seleccionar</option>`);
        (CM.clientes || [])
            .slice()
            .sort((a, b) => String(a.Nombre || "").localeCompare(String(b.Nombre || "")))
            .forEach(x => {
                const inactivo = x.Activo === false || x.Activo === 0;
                const nombre = x.Nombre || ("Cliente #" + x.Id);
                const etiqueta = inactivo ? `${nombre} (inactivo)` : nombre;
                $p.append(`<option value="${x.Id}">${etiqueta}</option>`);
            });

        if (idSel > 0 && $p.find(`option[value="${idSel}"]`).length) {
            $p.val(String(idSel));
        }
        initSelectClienteHeader();
    }

    function initSelectClienteHeader() {
        const $p = $("#cCliente");
        if (!$p.length) return;
        ensureSelect2Cm($p, {
            placeholder: "Seleccionar cliente",
            dropdownParent: $(".entregas-nuevo")
        });
    }

    async function cargarEstadoesEntrega() {
        const rEst = await fetch(API.estadosEntrega, { headers: authHeaders() });
        CM.estadosEntrega = rEst.ok ? await rEst.json() : [];

        if (typeof llenarSelectEstadoes === "function") {
            llenarSelectEstadoes($("#cEstado"), CM.estadosEntrega);
        } else {
            const $s = $("#cEstado");
            $s.empty().append(`<option value="">Seleccionar</option>`);
            (CM.estadosEntrega || []).forEach(x => {
                $s.append(`<option value="${x.Id}">${x.Nombre}</option>`);
            });
        }
        ensureSelect2Cm($("#cEstado"), { placeholder: "Seleccionar estado" });
    }

    async function cargarCamionesEntrega() {
        const r = await fetch(API.camiones, { headers: authHeaders() });
        const camiones = r.ok ? await r.json() : [];
        const $s = $("#cCamion");
        $s.empty().append(`<option value="">Seleccionar</option>`);
        (camiones || []).forEach(x => {
            $s.append(`<option value="${x.Id}">${x.Nombre}</option>`);
        });
    }

    async function cargarProductosEntrega() {
        const r = await fetch(API.productos, { headers: authHeaders() });
        CM.productos = r.ok ? await r.json() : [];
    }

    async function cargarListasPreciosEntrega() {
        const r = await fetch(API.listasPrecios, { headers: authHeaders() });
        CM.listasPrecios = r.ok ? await r.json() : [];
    }

    async function obtenerPreciosProductoEntrega(idProducto) {
        const id = Number(idProducto || 0);
        if (id <= 0) return [];
        if (CM.preciosCache[id]) return CM.preciosCache[id];
        try {
            const r = await fetch(API.preciosProducto(id), { headers: authHeaders() });
            CM.preciosCache[id] = r.ok ? (await r.json()) || [] : [];
        } catch (e) {
            console.warn(e);
            CM.preciosCache[id] = [];
        }
        return CM.preciosCache[id];
    }

    function precioDesdeProductosEstablecimiento(idProducto, idLista) {
        const idP = Number(idProducto || 0);
        const idL = Number(idLista || 0);
        if (idP <= 0) return null;
        const rows = (CM.productosEstablecimiento || []).filter(x =>
            Number(x.IdProducto ?? x.idProducto) === idP
            && Number(x.PrecioVenta ?? x.precioVenta) > 0
        );
        if (!rows.length) return null;
        if (idL > 0) {
            const exact = rows.find(x => Number(x.IdListaPrecio ?? x.idListaPrecio) === idL);
            if (exact) return Number(exact.PrecioVenta ?? exact.precioVenta);
        }
        const sinLista = rows.find(x => !(Number(x.IdListaPrecio ?? x.idListaPrecio) > 0));
        if (sinLista) return Number(sinLista.PrecioVenta ?? sinLista.precioVenta);
        return Number(rows[0].PrecioVenta ?? rows[0].precioVenta);
    }

    async function obtenerPrecioListaEntrega(idProducto, idLista) {
        const idL = Number(idLista || 0);
        if (!idProducto || !idL) return null;
        const rows = await obtenerPreciosProductoEntrega(idProducto);
        const match = (rows || []).find(x => Number(x.IdListaPrecio) === idL);
        // La matriz trae todas las listas con PrecioVenta=0 si no hay tarifa: no cuenta como precio.
        if (match && Number(match.PrecioVenta) > 0) return Number(match.PrecioVenta);

        const desdeEst = precioDesdeProductosEstablecimiento(idProducto, idL);
        if (desdeEst != null && desdeEst > 0) return desdeEst;
        return null;
    }

    /** Entrega / Retiro / Recuperado: trae precio de lista al elegir producto + lista. */
    function lineaTraePrecioDeLista(linea) {
        const t = Number(linea?.TipoMovimiento);
        return t === TIPO_LINEA_ENTREGA
            || t === TIPO_LINEA_RETIRO
            || t === TIPO_LINEA_RECUPERADO;
    }

    async function aplicarPrecioDesdeListaEntrega($tr, linea, { forzar = true } = {}) {
        if (!lineaTraePrecioDeLista(linea)) return false;
        const precio = await obtenerPrecioListaEntrega(linea.IdProducto, linea.IdListaPrecio);
        // Nunca pisar con 0: si no hay tarifa, dejar el valor actual.
        if (precio == null || !(Number(precio) > 0)) return false;
        if (!forzar && Number(linea.PrecioVenta) > 0) return false;
        linea.PrecioVenta = precio;
        setValorInputMiles($tr.find(".linea-precio"), precio);
        return true;
    }

    async function sincronizarPrecioSegunTipoLinea($tr, linea) {
        if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
            await aplicarPrecioDesdeListaEntrega($tr, linea, { forzar: true });
        }
    }

    function htmlOpcionesListaPrecio(linea) {
        const idSel = Number(linea.IdListaPrecio || 0);
        return (CM.listasPrecios || []).map(l => {
            const id = Number(l.Id || l.id || 0);
            const nom = l.Nombre || l.nombre || `Lista #${id}`;
            return `<option value="${id}" ${id === idSel ? "selected" : ""}>${nom}</option>`;
        }).join("");
    }

    function ensureSelect2Cm($el, opts) {
        if (!$el?.length) return;
        if ($el.data("select2")) $el.select2("destroy");
        $el.select2(Object.assign({ width: "100%", allowClear: false }, opts || {}));
    }

    function setModoNuevo() {
        CM.soloLectura = false;
        CM.cobrosLineas = [];
        $("#tituloPaginaEntrega").text("Nueva entrega");
        $("#lblGuardarEntrega").text("Registrar entrega");
        $("#btnEliminarEntrega").prop("hidden", true);
        $("#alertEntregaCobros").prop("hidden", true);

        const hoy = new Date().toISOString().slice(0, 10);
        $("#cFecha").val(hoy);
    }

    async function cargarEntrega(id) {
        const idEntrega = Number(id || 0);
        if (idEntrega <= 0) {
            setModoNuevo();
            return;
        }

        CM.cargandoEntrega = true;
        try {
            const r = await fetch(API.editarInfo(idEntrega), { headers: authHeaders() });
            if (!r.ok) {
                const msg = r.status === 401 || r.status === 403
                    ? "No tenés permiso para ver esta entrega (sesión vencida?). Volvé a iniciar sesión."
                    : r.status === 404
                        ? `No se encontró la entrega #${idEntrega}.`
                        : `No se pudo cargar la entrega #${idEntrega} (HTTP ${r.status}).`;
                if (typeof errorModal === "function") errorModal(msg);
                $("#tituloPaginaEntrega").text(`Entrega #${idEntrega} (error)`);
                return;
            }

            const d = await r.json();
            CM.id = Number(d.Id ?? d.id ?? idEntrega) || idEntrega;
            $("#Entrega_Id").val(String(CM.id));
            CM.soloLectura = !(d.PuedeEditar ?? d.puedeEditar ?? true);

            $("#tituloPaginaEntrega").text(`Entrega #${CM.id}`);
            $("#lblGuardarEntrega").text(CM.soloLectura ? "Solo lectura" : "Guardar cambios");
            $("#btnEliminarEntrega").prop("hidden", !(d.PuedeEliminar ?? d.puedeEliminar ?? true));
            $("#alertEntregaCobros").prop("hidden", !(d.TieneCobros ?? d.tieneCobros));
            CM.cobrosLineas = [];

            const fechaRaw = d.Fecha ?? d.fecha;
            const fecha = fechaRaw ? String(fechaRaw).slice(0, 10) : "";
            $("#cFecha").val(fecha);
            $("#cNota").val(d.NotaInterna || d.notaInterna || "");
            $("#cNotaCliente").val(d.NotaCliente || d.notaCliente || "");

            const idCliente = Number(d.IdCliente ?? d.idCliente ?? 0);
            await cargarClientesEntrega(idCliente);
            if (idCliente > 0) {
                $("#cCliente").val(String(idCliente)).trigger("change.select2");
            }
            const cli = (CM.clientes || []).find(x => Number(x.Id) === idCliente);
            CM.idSucursalCliente = Number(d.IdSucursal ?? d.idSucursal ?? cli?.IdSucursal ?? 0);
            await cargarEstablecimientosEntrega(
                idCliente,
                Number(d.IdEstablecimiento ?? d.idEstablecimiento ?? 0)
            );
            const idEstado = d.IdEstado ?? d.idEstado;
            const idCamion = d.IdCamion ?? d.idCamion;
            if (idEstado) $("#cEstado").val(String(idEstado)).trigger("change.select2");
            if (idCamion) $("#cCamion").val(String(idCamion)).trigger("change.select2");

            const lineasApi = Array.isArray(d.Lineas) ? d.Lineas : (Array.isArray(d.lineas) ? d.lineas : []);
            const recuperadasApi = Array.isArray(d.LineasRecuperadas)
                ? d.LineasRecuperadas
                : (Array.isArray(d.lineasRecuperadas) ? d.lineasRecuperadas : []);
            const lineasOperacion = lineasApi.map(l => mapLineaDesdeApi(l, Number(l.TipoMovimiento ?? l.tipoMovimiento ?? TIPO_LINEA_ENTREGA)));
            const lineasRecuperadasApi = recuperadasApi.map(l => mapLineaDesdeApi(l, TIPO_LINEA_RECUPERADO));
            CM.lineas = [...lineasOperacion, ...lineasRecuperadasApi];

            renderLineas();
            refrescarSelectsProducto();
            recalcularTotalesUI();

            if (CM.soloLectura) aplicarSoloLectura();

            await cargarCobrosEntrega();
        } catch (e) {
            console.error("cargarEntrega:", e);
            if (typeof errorModal === "function") {
                errorModal(`Error al cargar la entrega #${idEntrega}.`);
            }
            $("#tituloPaginaEntrega").text(`Entrega #${idEntrega} (error)`);
        } finally {
            CM.cargandoEntrega = false;
        }
    }

    function aplicarSoloLectura() {
        $("#btnGuardarEntrega").prop("disabled", true);
        $("#btnAgregarLinea, #btnAgregarRecuperado, #btnCrearProducto, #btnAtajoEstadoEntrega").prop("hidden", true);
        $("#cFecha, #cNota").prop("disabled", true);
        $("#cCliente, #cEstado, #cCamion, #cEstablecimiento").prop("disabled", true);
        $("#tbodyLineasEntrega input, #tbodyLineasEntrega select, #tbodyLineasRecuperados input, #tbodyLineasRecuperados select").prop("disabled", true);
        $("#tbodyLineasEntrega .btn-quitar-linea, #tbodyLineasRecuperados .btn-quitar-linea").prop("hidden", true);
        $("#btnAgregarCobroEntrega").prop("hidden", true);
        $("#tbodyCobrosEntrega input, #tbodyCobrosEntrega select").prop("disabled", true);
        $("#tbodyCobrosEntrega .btn-quitar-cobro-linea, #tbodyCobrosEntrega .btn-atajo-cuenta-cobro").prop("hidden", true);
    }

    function restaurarEdicionEntrega() {
        $("#btnGuardarEntrega").prop("disabled", false);
        $("#lblGuardarEntrega").text("Guardar cambios");
        $("#btnAgregarLinea, #btnAgregarRecuperado, #btnCrearProducto, #btnAtajoEstadoEntrega").prop("hidden", false);
        $("#cFecha, #cNota").prop("disabled", false);
        $("#cCliente, #cEstado, #cEstablecimiento").prop("disabled", false);
        $("#tbodyLineasEntrega input, #tbodyLineasEntrega select, #tbodyLineasRecuperados input, #tbodyLineasRecuperados select").prop("disabled", false);
        $("#tbodyLineasEntrega .btn-quitar-linea, #tbodyLineasRecuperados .btn-quitar-linea").prop("hidden", false);
        $("#btnAgregarCobroEntrega").prop("hidden", false);
        $("#tbodyCobrosEntrega input, #tbodyCobrosEntrega select").prop("disabled", false);
        $("#tbodyCobrosEntrega .btn-quitar-cobro-linea, #tbodyCobrosEntrega .btn-atajo-cuenta-cobro").prop("hidden", false);
        refrescarSelectsProducto();
        actualizarBotonesAgregarLinea();
    }

    async function cargarCuentasCajaEntrega() {
        try {
            const r = await fetch(API.cuentas, { headers: authHeaders() });
            CM.cuentasCaja = r.ok ? await r.json() : [];
        } catch {
            CM.cuentasCaja = [];
        }
    }

    function cuentasPorSucursalEntrega(idSucursal) {
        if (!idSucursal) return CM.cuentasCaja || [];
        return (CM.cuentasCaja || []).filter(x => String(x.IdCombo) === String(idSucursal));
    }

    function totalPorTipoLineaEntrega(tipo) {
        const t = Number(tipo);
        let tot = 0;
        CM.lineas.forEach(l => {
            if (Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA) === t) {
                tot += calcularLinea(l).subtotalFinal;
            }
        });
        return tot;
    }

    /** Lo cobrable = entrega + retiro (productos vendidos y servicio/tratamiento). */
    function calcularTotalCobrableDesdeLineas() {
        return totalPorTipoLineaEntrega(TIPO_LINEA_ENTREGA)
            + totalPorTipoLineaEntrega(TIPO_LINEA_RETIRO);
    }

    function calcularTotalEntregaDesdeLineas() {
        return totalPorTipoLineaEntrega(TIPO_LINEA_ENTREGA);
    }

    function htmlOpcionesSucursalCobro(cobro) {
        return (CM.sucursales || [])
            .map(s =>
                `<option value="${s.Id}" ${String(s.Id) === String(cobro.IdSucursal) ? "selected" : ""}>${escapeHtmlCm(s.Nombre)}</option>`
            )
            .join("");
    }

    function htmlOpcionesCuentaCobro(cobro) {
        const cuentas = cuentasPorSucursalEntrega(cobro.IdSucursal);
        if (!cobro.IdSucursal) {
            return `<option value="">Seleccione sucursal</option>`;
        }
        return cuentas
            .map(c =>
                `<option value="${c.Id}" ${String(c.Id) === String(cobro.IdCuenta) ? "selected" : ""}>${escapeHtmlCm(c.Nombre)}</option>`
            )
            .join("");
    }

    function fechaInputValor(fecha) {
        if (!fecha) return "";
        const s = String(fecha);
        if (s.length >= 10) return s.slice(0, 10);
        try {
            return new Date(fecha).toISOString().slice(0, 10);
        } catch {
            return "";
        }
    }

    function conceptoCobroDefault() {
        return CM.id > 0 ? `Cobro entrega #${CM.id}` : "Cobro entrega";
    }

    function agregarCobroLinea(preset) {
        if (CM.soloLectura) return;

        const hoy = new Date().toISOString().slice(0, 10);
        const idSuc = CM.idSucursalCliente || 0;

        const cobro = preset || {
            _key: CM.nextCobroKey++,
            IdCobro: 0,
            IdMovimientoCc: 0,
            Fecha: hoy,
            IdSucursal: idSuc,
            IdCuenta: 0,
            Concepto: conceptoCobroDefault(),
            Importe: 0
        };

        if (!cobro.IdCuenta && cobro.IdSucursal) {
            const cuentas = cuentasPorSucursalEntrega(cobro.IdSucursal);
            if (cuentas.length === 1) {
                cobro.IdCuenta = Number(cuentas[0].Id) || 0;
            }
        }

        CM.cobrosLineas.push(cobro);
        renderCobrosLineas();
        actualizarResumenCobrosUI();
    }

    function quitarCobroLinea(key) {
        if (CM.soloLectura) return;
        CM.cobrosLineas = CM.cobrosLineas.filter(x => x._key !== key);
        renderCobrosLineas();
        actualizarResumenCobrosUI();
    }

    function syncCobroFromRow($tr, cobro) {
        cobro.Fecha = $tr.find(".cobro-fecha").val() || "";
        cobro.IdSucursal = parseInt($tr.find(".cobro-sucursal").val(), 10) || 0;
        cobro.IdCuenta = parseInt($tr.find(".cobro-cuenta").val(), 10) || 0;
        cobro.Concepto = ($tr.find(".cobro-concepto").val() || "").trim();
        cobro.Importe = leerNum($tr.find(".cobro-importe").val());
    }

    function renderCobrosLineas() {
        const $tb = $("#tbodyCobrosEntrega");
        $tb.empty();

        CM.cobrosLineas.forEach(cobro => {
            const k = cobro._key;
            const fechaVal = fechaInputValor(cobro.Fecha);
            const sucOpts = htmlOpcionesSucursalCobro(cobro);
            const ctaOpts = htmlOpcionesCuentaCobro(cobro);

            const tr = $(`
                <tr data-key="${k}">
                    <td><input type="date" class="form-control vn-input vn-mini cobro-fecha" value="${fechaVal}" /></td>
                    <td>
                        <select class="form-select vn-input vn-mini cobro-sucursal" id="cobro_${k}_sucursal">
                            <option value="">Seleccionar</option>
                            ${sucOpts}
                        </select>
                    </td>
                    <td>
                        <div class="vn-select-plus vn-select-plus--cobro">
                            <select class="form-select vn-input vn-mini cobro-cuenta" id="cobro_${k}_cuenta">
                                <option value="">Seleccionar</option>
                                ${ctaOpts}
                            </select>
                            <button type="button"
                                    class="vn-btn-plus btn-atajo-cuenta-cobro"
                                    title="Agregar cuenta"
                                    data-config-nombre="Cuentas"
                                    data-config-controller="Cuentas"
                                    data-config-combo-nombre="Sucursales"
                                    data-config-combo-controller="Sucursales"
                                    data-config-combo-label="Sucursal">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </td>
                    <td><input type="text" class="form-control vn-input vn-mini cobro-concepto" maxlength="200" /></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles cobro-importe text-end" value="${Number(cobro.IdCuenta) > 0 ? fmtInputNum(cobro.Importe) : ""}" ${Number(cobro.IdCuenta) > 0 && !CM.soloLectura ? "" : "disabled"} title="${Number(cobro.IdCuenta) > 0 ? "" : "Seleccioná la cuenta para cargar el importe"}" /></td>
                    <td class="text-center">
                        <button type="button" class="btn btn-outline-danger btn-sm btn-quitar-cobro-linea" title="Quitar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);

            $tb.append(tr);
            tr.find(".cobro-concepto").val(cobro.Concepto || "");

            const $imp = tr.find(".cobro-importe");
            if (typeof prepararInputMiles === "function") prepararInputMiles($imp[0]);
            if ($imp[0].value && typeof formatearMilesInput === "function") formatearMilesInput($imp[0]);

            const $suc = tr.find(".cobro-sucursal");
            const $cta = tr.find(".cobro-cuenta");

            function repoblarCuentasCobro(mantenerCuenta) {
                const idCuentaPrev = mantenerCuenta ? (parseInt($cta.val(), 10) || cobro.IdCuenta || 0) : 0;
                const opts = htmlOpcionesCuentaCobro(cobro);
                if ($cta.data("select2")) $cta.select2("destroy");
                $cta.html(`<option value="">Seleccionar</option>${opts}`);
                ensureSelect2Cm($cta, { placeholder: "Cuenta", dropdownParent: $(".entregas-nuevo") });
                if (idCuentaPrev > 0) {
                    $cta.val(String(idCuentaPrev)).trigger("change.select2");
                    cobro.IdCuenta = idCuentaPrev;
                } else {
                    $cta.val("").trigger("change.select2");
                    cobro.IdCuenta = 0;
                }
            }

            ensureSelect2Cm($suc, { placeholder: "Sucursal", dropdownParent: $(".entregas-nuevo") });
            if (cobro.IdSucursal) {
                $suc.val(String(cobro.IdSucursal));
            }
            repoblarCuentasCobro(true);

            function syncImporteHabilitadoCobroEntrega() {
                const idCuenta = parseInt($cta.val(), 10) || 0;
                const habilitar = idCuenta > 0 && !CM.soloLectura;
                $imp.prop("disabled", !habilitar);
                $imp.prop("readonly", !habilitar);
                $imp.attr("tabindex", habilitar ? "0" : "-1");
                if (!habilitar && !CM.soloLectura) {
                    $imp.val("");
                    cobro.Importe = 0;
                }
                $imp.attr("placeholder", habilitar || CM.soloLectura ? "" : "Elegí cuenta");
                $imp.attr("title", habilitar || CM.soloLectura ? "" : "Seleccioná la cuenta para cargar el importe");
            }

            $suc.on("change", function () {
                cobro.IdSucursal = parseInt($(this).val(), 10) || 0;
                cobro.IdCuenta = 0;
                repoblarCuentasCobro(false);
                syncImporteHabilitadoCobroEntrega();
                actualizarResumenCobrosUI();
            });

            tr.find(".cobro-fecha, .cobro-concepto, .cobro-importe").on("input change", function () {
                syncCobroFromRow(tr, cobro);
                actualizarResumenCobrosUI();
            });

            $cta.on("change", function () {
                syncCobroFromRow(tr, cobro);
                syncImporteHabilitadoCobroEntrega();
                actualizarResumenCobrosUI();
            });

            syncImporteHabilitadoCobroEntrega();

            tr.find(".btn-quitar-cobro-linea").on("click", () => quitarCobroLinea(k));
        });

        $("#btnAgregarCobroEntrega").prop("disabled", CM.soloLectura);
        $("#tbodyCobrosEntrega .btn-atajo-cuenta-cobro").prop("hidden", !!CM.soloLectura).prop("disabled", !!CM.soloLectura);
        actualizarUIEstadoVaciosEntrega();
    }

    function escapeHtmlCm(t) {
        return String(t ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function actualizarResumenCobrosUI() {
        const totalEntrega = calcularTotalEntregaDesdeLineas();
        const totalRetiro = totalPorTipoLineaEntrega(TIPO_LINEA_RETIRO);
        const totalCobrable = totalEntrega + totalRetiro;
        const activos = cobrosActivos();
        const totalPagado = activos.reduce((s, p) => s + Number(p.Importe || 0), 0);

        const saldo = totalCobrable - totalPagado;
        const saldoCls = typeof clsSaldoDeudaMoney === "function"
            ? clsSaldoDeudaMoney(saldo)
            : "";
        const esFavor = saldo < -0.009;
        const lblSaldo = esFavor ? "Saldo" : "Saldo pendiente";

        $("#cobroTotEntrega").text(fmtMoney(totalEntrega));
        $("#cobroTotRetiro").text(fmtMoney(totalRetiro));
        $("#cobroTotPagado").text(fmtMoney(totalPagado));
        $("#cobroSaldoPendLbl").text(lblSaldo);
        $("#cobroSaldoPend").text(fmtMoney(saldo)).attr("class", "val " + saldoCls);
        $("#cobroSaldoPendKpi")
            .toggleClass("cm-cobros-kpi--pend", !esFavor && saldo > 0.009)
            .toggleClass("cm-cobros-kpi--ok", esFavor);
        $("#totPagadoResumen").text(fmtMoney(totalPagado));
        $("#totSaldoResumenLbl").text(lblSaldo);
        $("#totSaldoResumen").text(fmtMoney(saldo)).attr("class", "val cm-resumen-saldo " + saldoCls);
        const accionGuardar = CM.id > 0 ? "Guardar cambios" : "Registrar entrega";
        $("#lblCobrosHintText").text(
            activos.length
                ? `${activos.length} cobro(s) en la grilla. Se guardan al pulsar ${accionGuardar} (caja y cuenta corriente).`
                : "Agrega filas de cobro como en productos. Nada se registra hasta guardar la entrega."
        );

        actualizarUIEstadoVaciosEntrega();
    }

    async function cargarCobrosEntrega() {
        if (CM.id <= 0) {
            renderCobrosLineas();
            actualizarResumenCobrosUI();
            return;
        }

        try {
            const r = await fetch(API.cobros(CM.id), { headers: authHeaders() });
            if (!r.ok) return;

            const d = await r.json();
            CM.cobrosResumen = d;
            const lista = d.Cobros || d.cobros || [];

            CM.cobrosLineas = lista.map(p => ({
                _key: CM.nextCobroKey++,
                IdCobro: p.IdCobro ?? p.idCobro ?? 0,
                IdMovimientoCc: p.IdMovimientoCc ?? p.idMovimientoCc ?? 0,
                Fecha: fechaInputValor(p.Fecha || p.fecha),
                IdSucursal: p.IdSucursal ?? p.idSucursal ?? 0,
                IdCuenta: p.IdCuenta ?? p.idCuenta ?? 0,
                Concepto: p.Concepto || p.concepto || conceptoCobroDefault(),
                Importe: Number(p.Importe ?? p.importe ?? 0)
            }));

            const tieneCobros = d.TieneCobros === true || d.tieneCobros === true || CM.cobrosLineas.length > 0;
            $("#alertEntregaCobros").prop("hidden", !tieneCobros);

            renderCobrosLineas();
            actualizarResumenCobrosUI();
        } catch (e) {
            console.error(e);
        }
    }

    function agregarLinea(preset) {
        if (CM.soloLectura) return;

        const tipo = Number((preset && preset.TipoMovimiento) || TIPO_LINEA_ENTREGA);
        const linea = Object.assign({
            _key: CM.nextLineId++,
            Id: 0,
            IdProducto: 0,
            IdListaPrecio: 0,
            TipoMovimiento: tipo,
            NoRetirado: false,
            Cantidad: 1,
            PrecioVenta: 0,
            PorcDescuento: 0,
            PorcIva: 21
        }, preset || {});
        if (!linea._key) linea._key = CM.nextLineId++;
        linea.TipoMovimiento = tipo;
        if (tipo !== TIPO_LINEA_RETIRO) linea.NoRetirado = false;

        CM.lineas.push(linea);
        renderLineas();
        recalcularTotalesUI();

        if (tipo === TIPO_LINEA_RECUPERADO) {
            activarTabEntrega("recuperados");
        } else {
            activarTabEntrega("productos");
        }
    }

    function quitarLinea(key) {
        if (CM.soloLectura) return;
        CM.lineas = CM.lineas.filter(x => x._key !== key);
        renderLineas();
        recalcularTotalesUI();
    }

    /**
     * Huella de línea: solo se considera duplicada si todos los campos editables coinciden.
     */
    function normNumClaveLinea(n) {
        const v = Number(n);
        if (!Number.isFinite(v)) return "0";
        return (Math.round(v * 10000) / 10000).toString();
    }

    function claveUnicaLineaProducto(l) {
        const tipo = Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA);
        const idLista = Number(l.IdListaPrecio) > 0 ? Number(l.IdListaPrecio) : 0;
        const cant = normNumClaveLinea(l.Cantidad);
        const precio = normNumClaveLinea(l.PrecioVenta);
        const desc = normNumClaveLinea(l.PorcDescuento);
        const iva = normNumClaveLinea(l.PorcIva);
        if (tipo === TIPO_LINEA_RECUPERADO) {
            return `${l.IdProducto}|${TIPO_LINEA_RECUPERADO}|${idLista}|${cant}|${precio}|${desc}|${iva}`;
        }
        const noRet = tipo === TIPO_LINEA_RETIRO && !!l.NoRetirado ? "1" : "0";
        return `${l.IdProducto}|${tipo}|${noRet}|${idLista}|${cant}|${precio}|${desc}|${iva}`;
    }

    function keysLineasDuplicadasEntrega() {
        const map = new Map();
        const dups = new Set();
        (CM.lineas || []).forEach(l => {
            if (!(Number(l.IdProducto) > 0) || !l._key) return;
            const k = claveUnicaLineaProducto(l);
            if (map.has(k)) {
                dups.add(map.get(k));
                dups.add(l._key);
            } else {
                map.set(k, l._key);
            }
        });
        return dups;
    }

    function actualizarAlertaDuplicadosLineasEntrega() {
        const dups = keysLineasDuplicadasEntrega();
        const hayDup = dups.size > 0;

        $("#tbodyLineasEntrega .en-linea, #tbodyLineasRecuperadas .en-linea").each(function () {
            const key = Number($(this).data("key"));
            $(this).toggleClass("en-linea--dup", dups.has(key));
        });

        const $alert = $("#alertLineasDuplicadasEntrega");
        if ($alert.length) {
            if (hayDup) $alert.removeAttr("hidden");
            else $alert.attr("hidden", true);
        }
        return !hayDup;
    }

    function htmlOpcionesProducto(linea) {
        return (CM.productos || [])
            .map(p =>
                `<option value="${p.Id}" ${String(p.Id) === String(linea.IdProducto) ? "selected" : ""}>${p.Nombre}</option>`
            )
            .join("");
    }

    function refrescarSelectsProducto() {
        CM.lineas.forEach(linea => {
            const $sel = $(`#linea_${linea._key}_producto`);
            if (!$sel.length) return;

            const val = linea.IdProducto > 0 ? String(linea.IdProducto) : "";
            const opts = htmlOpcionesProducto(linea);

            if ($sel.data("select2")) {
                $sel.select2("destroy");
            }

            $sel.html(`<option value="">Seleccionar</option>${opts}`);
            $sel.val(val && $sel.find(`option[value="${val}"]`).length ? val : "");
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".entregas-nuevo") });

            const $lista = $sel.closest(".en-linea").find(".linea-lista");
            if ($lista.length) {
                const valLista = Number(linea.IdListaPrecio) > 0 ? String(linea.IdListaPrecio) : "";
                if ($lista.data("select2")) $lista.select2("destroy");
                $lista.html(`<option value="">Seleccionar</option>${htmlOpcionesListaPrecio(linea)}`);
                $lista.val(valLista && $lista.find(`option[value="${valLista}"]`).length ? valLista : "");
                ensureSelect2Cm($lista, { placeholder: "Lista / Tipo pago", allowClear: true, dropdownParent: $(".entregas-nuevo") });
            }
        });
    }

    function hayProductosDisponiblesParaTipo() {
        return (CM.productos || []).length > 0;
    }

    function hayProductosDisponiblesEnSeccionProductos() {
        return (CM.productos || []).length > 0;
    }

    function actualizarBotonesAgregarLinea() {
        $("#btnAgregarLinea").prop("disabled", CM.soloLectura || !hayProductosDisponiblesEnSeccionProductos());
        $("#btnAgregarRecuperado").prop("disabled", CM.soloLectura || !hayProductosDisponiblesParaTipo());
    }

    function renderLineas() {
        renderLineasProductos();
        renderLineasRecuperadas();
        actualizarUIEstadoVaciosEntrega();
    }

    function renderLineasProductos() {
        const $tb = $("#tbodyLineasEntrega");
        $tb.empty();

        CM.lineas.filter(l => !esLineaRecuperada(l)).forEach(linea => {
            const tipo = Number(linea.TipoMovimiento || TIPO_LINEA_ENTREGA);
            if (tipo !== TIPO_LINEA_ENTREGA && tipo !== TIPO_LINEA_RETIRO) {
                linea.TipoMovimiento = TIPO_LINEA_ENTREGA;
            }

            const k = linea._key;
            const prodOpts = htmlOpcionesProducto(linea);
            const calc = calcularLinea(linea);
            const t = Number(linea.TipoMovimiento);
            const esRetiro = t === TIPO_LINEA_RETIRO;
            const noRetChecked = esRetiro && !!linea.NoRetirado ? "checked" : "";

            const $row = $(`
                <div class="en-linea" data-key="${k}" data-seccion="productos">
                    <div class="en-linea-grid">
                        <label class="en-field en-field--prod">
                            <span>Producto</span>
                            <select id="linea_${k}_producto" class="form-select vn-input vn-mini linea-producto">
                                <option value="">Seleccionar</option>
                                ${prodOpts}
                            </select>
                        </label>
                        <label class="en-field en-field--tipo">
                            <span>Tipo</span>
                            <select class="form-select vn-input vn-mini linea-tipo">
                                <option value="${TIPO_LINEA_ENTREGA}" ${t === TIPO_LINEA_ENTREGA ? "selected" : ""}>Entrega</option>
                                <option value="${TIPO_LINEA_RETIRO}" ${t === TIPO_LINEA_RETIRO ? "selected" : ""}>Retiro</option>
                            </select>
                        </label>
                        <label class="en-field en-field--lista">
                            <span>Lista / Tipo pago</span>
                            <select class="form-select vn-input vn-mini linea-lista">
                                <option value="">Seleccionar</option>
                                ${htmlOpcionesListaPrecio(linea)}
                            </select>
                        </label>
                        <label class="en-field en-field--num">
                            <span>Cant.</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-cant" value="${fmtInputNum(linea.Cantidad)}" />
                        </label>
                            <label class="en-field en-field--num en-field--precio">
                            <span>Precio venta</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-precio" value="${fmtInputNum(linea.PrecioVenta)}" />
                        </label>
                        <label class="en-field en-field--num">
                            <span>% Desc</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-desc" value="${fmtInputNum(linea.PorcDescuento)}" />
                        </label>
                        <label class="en-field en-field--num">
                            <span>% IVA</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-iva" value="${fmtInputNum(linea.PorcIva)}" />
                        </label>
                    </div>
                    <div class="en-linea-foot">
                        <div class="en-linea-subtotal">
                            <span>Subtotal</span>
                            <strong class="linea-subtotal-cell linea-subtotal">${fmtMoney(calc.subtotalFinal)}</strong>
                        </div>
                        <label class="en-noret ${esRetiro ? "" : "d-none"} ${noRetChecked ? "is-on" : ""}" title="Marcar si el producto no se retiró en esta visita">
                            <input type="checkbox" class="linea-noret" ${noRetChecked} />
                            <i class="fa fa-ban" aria-hidden="true"></i>
                            <span>No retirado</span>
                        </label>
                        <button type="button" class="btn btn-outline-danger btn-quitar-linea" title="Quitar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `);

            $tb.append($row);
            prepararInputsMilesLinea($row);

            const $sel = $row.find(".linea-producto");
            const $tipo = $row.find(".linea-tipo");
            const $lista = $row.find(".linea-lista");
            const valProd = linea.IdProducto > 0 ? String(linea.IdProducto) : "";
            const valLista = Number(linea.IdListaPrecio) > 0 ? String(linea.IdListaPrecio) : "";
            $sel.val(valProd && $sel.find(`option[value="${valProd}"]`).length ? valProd : "");
            $lista.val(valLista && $lista.find(`option[value="${valLista}"]`).length ? valLista : "");
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".entregas-nuevo") });
            ensureSelect2Cm($lista, { placeholder: "Lista / Tipo pago", allowClear: true, dropdownParent: $(".entregas-nuevo") });

            $tipo.on("change", async function () {
                if (CM.cargandoEntrega) return;
                linea.TipoMovimiento = parseInt($(this).val(), 10) || TIPO_LINEA_ENTREGA;
                if (linea.TipoMovimiento !== TIPO_LINEA_RETIRO) linea.NoRetirado = false;
                syncUiNoRetiradoLinea($row, linea);
                syncLineaFromRow($row, linea);
                await sincronizarPrecioSegunTipoLinea($row, linea);
                syncLineaFromRow($row, linea);
                refrescarSelectsProducto();
                actualizarBotonesAgregarLinea();
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                recalcularTotalesUI();
            });

            $row.find(".linea-noret").on("change", function () {
                if (CM.cargandoEntrega) return;
                syncLineaFromRow($row, linea);
                syncUiNoRetiradoLinea($row, linea);
                actualizarAlertaDuplicadosLineasEntrega();
                recalcularTotalesUI();
            });

            $lista.on("change", async function () {
                if (CM.cargandoEntrega) return;
                linea.IdListaPrecio = parseInt($(this).val(), 10) || 0;
                if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
                    await aplicarPrecioDesdeListaEntrega($row, linea, { forzar: true });
                }
                syncLineaFromRow($row, linea);
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                refrescarSelectsProducto();
                actualizarBotonesAgregarLinea();
                recalcularTotalesUI();
            });

            $sel.on("change", async function () {
                if (CM.cargandoEntrega) return;
                linea.IdProducto = parseInt($(this).val(), 10) || 0;
                const prod = CM.productos.find(p => p.Id === linea.IdProducto);
                if (prod) {
                    linea.CostoUnitario = Number(prod.CostoUnitario || 0);
                }

                if (linea.IdProducto > 0 && !linea.IdListaPrecio) {
                    const precios = await obtenerPreciosProductoEntrega(linea.IdProducto);
                    const conPrecio = (precios || []).filter(p => Number(p.PrecioVenta) > 0);
                    let idListaAuto = 0;
                    if (conPrecio.length === 1) {
                        idListaAuto = Number(conPrecio[0].IdListaPrecio);
                    } else {
                        const estConPrecio = (CM.productosEstablecimiento || []).filter(x =>
                            Number(x.IdProducto ?? x.idProducto) === linea.IdProducto
                            && Number(x.PrecioVenta ?? x.precioVenta) > 0
                            && Number(x.IdListaPrecio ?? x.idListaPrecio) > 0
                        );
                        if (estConPrecio.length === 1) {
                            idListaAuto = Number(estConPrecio[0].IdListaPrecio ?? estConPrecio[0].idListaPrecio);
                        }
                    }
                    if (idListaAuto > 0) {
                        linea.IdListaPrecio = idListaAuto;
                        $lista.val(String(linea.IdListaPrecio)).trigger("change");
                        return;
                    }
                }

                if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
                    await aplicarPrecioDesdeListaEntrega($row, linea, { forzar: true });
                }

                syncLineaFromRow($row, linea);
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                refrescarSelectsProducto();
                actualizarBotonesAgregarLinea();
                recalcularTotalesUI();
            });

            $row.find(".linea-cant, .linea-precio, .linea-desc, .linea-iva").on("input change", function () {
                syncLineaFromRow($row, linea);
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                recalcularTotalesUI();
            });

            $row.find(".btn-quitar-linea").on("click", () => quitarLinea(k));
        });
    }

    function renderLineasRecuperadas() {
        const $tb = $("#tbodyLineasRecuperados");
        $tb.empty();

        lineasRecuperadas().forEach(linea => {
            linea.TipoMovimiento = TIPO_LINEA_RECUPERADO;
            const k = linea._key;
            const prodOpts = htmlOpcionesProducto(linea);
            const calc = calcularLinea(linea);

            const $row = $(`
                <div class="en-linea en-linea--rec" data-key="${k}" data-tipo="${TIPO_LINEA_RECUPERADO}">
                    <div class="en-linea-grid en-linea-grid--rec">
                        <label class="en-field en-field--prod">
                            <span>Producto</span>
                            <select id="linea_${k}_producto" class="form-select vn-input vn-mini linea-producto">
                                <option value="">Seleccionar</option>
                                ${prodOpts}
                            </select>
                        </label>
                        <label class="en-field en-field--lista">
                            <span>Lista / Tipo pago</span>
                            <select class="form-select vn-input vn-mini linea-lista">
                                <option value="">Seleccionar</option>
                                ${htmlOpcionesListaPrecio(linea)}
                            </select>
                        </label>
                        <label class="en-field en-field--num">
                            <span>Cant.</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-cant" value="${fmtInputNum(linea.Cantidad)}" />
                        </label>
                        <label class="en-field en-field--num en-field--precio">
                            <span>Precio ref.</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-precio" value="${fmtInputNum(linea.PrecioVenta)}" />
                        </label>
                        <label class="en-field en-field--num">
                            <span>% Desc</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-desc" value="${fmtInputNum(linea.PorcDescuento)}" />
                        </label>
                        <label class="en-field en-field--num">
                            <span>% IVA</span>
                            <input type="text" inputmode="decimal" autocomplete="off" class="form-control vn-input vn-mini Inputmiles linea-iva" value="${fmtInputNum(linea.PorcIva)}" />
                        </label>
                    </div>
                    <div class="en-linea-foot">
                        <div class="en-linea-subtotal">
                            <span>Subtotal</span>
                            <strong class="linea-subtotal-cell linea-subtotal text-success">${fmtMoney(calc.subtotalFinal)}</strong>
                        </div>
                        <button type="button" class="btn btn-outline-danger btn-quitar-linea" title="Quitar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `);

            $tb.append($row);
            prepararInputsMilesLinea($row);

            const $sel = $row.find(".linea-producto");
            const $lista = $row.find(".linea-lista");
            const valProd = linea.IdProducto > 0 ? String(linea.IdProducto) : "";
            const valLista = Number(linea.IdListaPrecio) > 0 ? String(linea.IdListaPrecio) : "";
            $sel.val(valProd && $sel.find(`option[value="${valProd}"]`).length ? valProd : "");
            $lista.val(valLista && $lista.find(`option[value="${valLista}"]`).length ? valLista : "");
            ensureSelect2Cm($sel, { placeholder: "Producto", dropdownParent: $(".entregas-nuevo") });
            ensureSelect2Cm($lista, { placeholder: "Lista / Tipo pago", allowClear: true, dropdownParent: $(".entregas-nuevo") });

            $lista.on("change", async function () {
                if (CM.cargandoEntrega) return;
                linea.IdListaPrecio = parseInt($(this).val(), 10) || 0;
                if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
                    await aplicarPrecioDesdeListaEntrega($row, linea, { forzar: true });
                }
                syncLineaFromRow($row, linea);
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                refrescarSelectsProducto();
                actualizarBotonesAgregarLinea();
                recalcularTotalesUI();
            });

            $sel.on("change", async function () {
                if (CM.cargandoEntrega) return;
                linea.IdProducto = parseInt($(this).val(), 10) || 0;
                const prod = CM.productos.find(p => p.Id === linea.IdProducto);
                if (prod) {
                    linea.CostoUnitario = Number(prod.CostoUnitario || 0);
                }

                if (linea.IdProducto > 0 && !linea.IdListaPrecio) {
                    const precios = await obtenerPreciosProductoEntrega(linea.IdProducto);
                    const conPrecio = (precios || []).filter(p => Number(p.PrecioVenta) > 0);
                    let idListaAuto = 0;
                    if (conPrecio.length === 1) {
                        idListaAuto = Number(conPrecio[0].IdListaPrecio);
                    } else {
                        const estConPrecio = (CM.productosEstablecimiento || []).filter(x =>
                            Number(x.IdProducto ?? x.idProducto) === linea.IdProducto
                            && Number(x.PrecioVenta ?? x.precioVenta) > 0
                            && Number(x.IdListaPrecio ?? x.idListaPrecio) > 0
                        );
                        if (estConPrecio.length === 1) {
                            idListaAuto = Number(estConPrecio[0].IdListaPrecio ?? estConPrecio[0].idListaPrecio);
                        }
                    }
                    if (idListaAuto > 0) {
                        linea.IdListaPrecio = idListaAuto;
                        $lista.val(String(linea.IdListaPrecio)).trigger("change");
                        return;
                    }
                }

                if (linea.IdProducto > 0 && linea.IdListaPrecio > 0) {
                    await aplicarPrecioDesdeListaEntrega($row, linea, { forzar: true });
                }

                syncLineaFromRow($row, linea);
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                refrescarSelectsProducto();
                actualizarBotonesAgregarLinea();
                recalcularTotalesUI();
            });

            $row.find(".linea-cant, .linea-precio, .linea-desc, .linea-iva").on("input change", function () {
                syncLineaFromRow($row, linea);
                $row.find(".linea-subtotal").text(fmtMoney(calcularLinea(linea).subtotalFinal));
                recalcularTotalesUI();
            });

            $row.find(".btn-quitar-linea").on("click", () => quitarLinea(k));
        });
    }

    function syncLineaFromRow($tr, linea) {
        const tipoDom = parseInt($tr.data("tipo"), 10);
        if (tipoDom === TIPO_LINEA_RECUPERADO) {
            linea.TipoMovimiento = TIPO_LINEA_RECUPERADO;
        } else if ($tr.find(".linea-tipo").length) {
            linea.TipoMovimiento = parseInt($tr.find(".linea-tipo").val(), 10) || TIPO_LINEA_ENTREGA;
        }
        linea.Cantidad = leerNum($tr.find(".linea-cant").val());
        linea.PrecioVenta = leerNum($tr.find(".linea-precio").val());
        linea.PorcDescuento = leerNum($tr.find(".linea-desc").val());
        linea.PorcIva = leerNum($tr.find(".linea-iva").val());
        linea.IdProducto = parseInt($tr.find(".linea-producto").val(), 10) || 0;
        if ($tr.find(".linea-lista").length) {
            linea.IdListaPrecio = parseInt($tr.find(".linea-lista").val(), 10) || 0;
        }
        if (Number(linea.TipoMovimiento) === TIPO_LINEA_RETIRO) {
            linea.NoRetirado = $tr.find(".linea-noret").is(":checked");
        } else {
            linea.NoRetirado = false;
        }
        syncUiNoRetiradoLinea($tr, linea);
    }

    function syncUiNoRetiradoLinea($tr, linea) {
        if (!$tr?.length) return;
        const esRetiro = Number(linea?.TipoMovimiento) === TIPO_LINEA_RETIRO;
        const $wrap = $tr.find(".en-noret");
        $wrap.toggleClass("d-none", !esRetiro);
        if (!esRetiro) {
            $tr.find(".linea-noret").prop("checked", false);
            $wrap.removeClass("is-on");
            if (linea) linea.NoRetirado = false;
        } else if (linea) {
            $tr.find(".linea-noret").prop("checked", !!linea.NoRetirado);
            $wrap.toggleClass("is-on", !!linea.NoRetirado);
        } else {
            $wrap.toggleClass("is-on", $tr.find(".linea-noret").is(":checked"));
        }
    }

    function calcularLinea(linea) {
        const cant = Number(linea.Cantidad || 0);
        const costo = Number(linea.PrecioVenta || 0);
        const porcDesc = Number(linea.PorcDescuento || 0);
        const porcIva = Number(linea.PorcIva || 0);

        const descUnit = costo * porcDesc / 100;
        const costoCdesc = costo - descUnit;
        const subtotalCdesc = costoCdesc * cant;
        const ivaUnit = costoCdesc * porcIva / 100;
        const ivaTotal = ivaUnit * cant;
        const subtotalFinal = subtotalCdesc + ivaTotal;
        const t = Number(linea.TipoMovimiento || TIPO_LINEA_ENTREGA);
        const signo = t === TIPO_LINEA_RECUPERADO ? 0 : (t === TIPO_LINEA_RETIRO ? -1 : 1);

        return {
            descTotal: descUnit * cant,
            subtotalCdesc,
            ivaTotal,
            subtotalFinal,
            signo,
            signedSubtotalcDesc: subtotalCdesc * signo,
            signedDescTotal: (descUnit * cant) * signo,
            signedIvaTotal: ivaTotal * signo,
            signedSubtotalFinal: subtotalFinal * signo
        };
    }

    function actualizarAvisoProductosCruzados() {
        const idsOperacion = new Set(
            lineasProductosOperacion()
                .filter(l => l.IdProducto > 0)
                .map(l => l.IdProducto)
        );
        const hayCruce = lineasRecuperadas().some(l => l.IdProducto > 0 && idsOperacion.has(l.IdProducto));
        $("#alertProductoEntregaRecuperado").prop("hidden", !hayCruce);
    }

    function recalcularTotalesUI() {
        // Totales del documento = entrega + retiro (lo cobrable). Recuperados no suman.
        let sub = 0, desc = 0, iva = 0, tot = 0;

        CM.lineas.forEach(l => {
            const t = Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA);
            if (t !== TIPO_LINEA_ENTREGA && t !== TIPO_LINEA_RETIRO) return;
            const c = calcularLinea(l);
            sub += c.subtotalCdesc;
            desc += c.descTotal;
            iva += c.ivaTotal;
            tot += c.subtotalFinal;
        });

        $("#totSubtotal").text(fmtMoney(sub));
        $("#totDescuentos").text(fmtMoney(desc));
        $("#totIva").text(fmtMoney(iva));
        $("#totImporte").text(fmtMoney(tot));
        actualizarResumenCobrosUI();
        actualizarAvisoProductosCruzados();
        actualizarAlertaDuplicadosLineasEntrega();
    }

    function mapLineaDesdeApi(l, tipoMovimiento) {
        return {
            _key: CM.nextLineId++,
            Id: Number(l.Id ?? l.id ?? 0) || 0,
            IdProducto: Number(l.IdProducto ?? l.idProducto ?? 0) || 0,
            IdListaPrecio: Number(l.IdListaPrecio ?? l.idListaPrecio ?? 0) || 0,
            TipoMovimiento: tipoMovimiento,
            NoRetirado: tipoMovimiento === TIPO_LINEA_RETIRO && !!(l.NoRetirado ?? l.noRetirado),
            Cantidad: Number(l.Cantidad ?? l.cantidad ?? 0) || 0,
            PrecioVenta: Number(l.PrecioVenta ?? l.precioVenta ?? 0) || 0,
            CostoUnitario: Number(l.CostoUnitario ?? l.costoUnitario ?? 0) || 0,
            PorcDescuento: Number(l.PorcDescuento ?? l.porcDescuento ?? 0) || 0,
            PorcIva: Number(l.PorcIva ?? l.porcIva ?? 0) || 0
        };
    }

    function mapLineaParaGuardar(l) {
        return {
            Id: l.Id || 0,
            IdProducto: l.IdProducto,
            IdListaPrecio: Number(l.IdListaPrecio || 0) > 0 ? Number(l.IdListaPrecio) : null,
            Cantidad: l.Cantidad,
            PrecioVenta: l.PrecioVenta,
            CostoUnitario: l.CostoUnitario || 0,
            PorcDescuento: l.PorcDescuento,
            PorcIva: l.PorcIva
        };
    }

    function obtenerPayload() {
        const lineasOperacion = lineasProductosOperacion().filter(l => l.IdProducto > 0);
        const lineasRec = lineasRecuperadas().filter(l => l.IdProducto > 0);
        const idEst = parseInt($("#cEstablecimiento").val(), 10) || 0;

        const payload = {
            Id: CM.id,
            Fecha: $("#cFecha").val() || null,
            IdCliente: parseInt($("#cCliente").val(), 10) || 0,
            IdEstablecimiento: idEst,
            IdContrato: null,
            IdEstado: parseInt($("#cEstado").val(), 10) || null,
            IdCamion: parseInt($("#cCamion").val(), 10) || null,
            NotaInterna: ($("#cNota").val() || "").trim() || null,
            NotaCliente: ($("#cNotaCliente").val() || "").trim() || null,
            Lineas: lineasOperacion.map(l => ({
                ...mapLineaParaGuardar(l),
                TipoMovimiento: Number(l.TipoMovimiento || TIPO_LINEA_ENTREGA),
                NoRetirado: Number(l.TipoMovimiento) === TIPO_LINEA_RETIRO && !!l.NoRetirado
            })),
            LineasRecuperadas: lineasRec.map(mapLineaParaGuardar),
            Cobros: cobrosParaGuardar().map(p => ({
                IdCobro: p.IdCobro || 0,
                IdMovimientoCc: p.IdMovimientoCc || 0,
                IdCuenta: p.IdCuenta,
                Fecha: p.Fecha,
                Concepto: p.Concepto,
                Importe: p.Importe
            }))
        };

        return payload;
    }

    async function guardarEntrega() {
        if (CM.soloLectura) return;

        sincronizarLineasDesdeDom();
        sincronizarCobrosDesdeDom();

        const validacion = validarEntregaLocal();
        if (!validacion.ok) {
            mostrarErrorEntrega(validacion.mensaje, validacion.secciones);
            return;
        }

        const validCobros = validarCobrosLocal();
        if (!validCobros.ok) {
            mostrarErrorEntrega(validCobros.mensaje, { cobros: true });
            return;
        }

        const payload = obtenerPayload();
        const esNuevo = CM.id <= 0;
        const url = esNuevo ? API.insertar : API.actualizar;
        const method = esNuevo ? "POST" : "PUT";

        const r = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });

        if (!r.ok) {
            mostrarErrorEntrega("Error de comunicacion con el servidor.");
            return;
        }

        const result = await r.json();
        const ok = result.valor === true || result.valor === "true" || result.ok === true;

        if (ok) {
            cerrarErrorEntrega();
            limpiarMarcasErrorSeccionesEntrega();

            const idClienteVolver = Number(CM.init?.idCliente || $("#cCliente").val() || 0);
            const desdeCliente = !!CM.init?.volverCliente && idClienteVolver > 0;
            const urlVolver = desdeCliente
                ? (CM.init?.urlVolverCliente || `/Clientes/Gestion?id=${idClienteVolver}`)
                : "/ClientesEntregas/Index";

            const irAEdicion = (idEntrega) => {
                let url = `/ClientesEntregas/NuevoModif?id=${idEntrega || 0}`;
                if (idClienteVolver > 0) url += `&idCliente=${idClienteVolver}`;
                if (desdeCliente) url += `&volverCliente=true`;
                window.location.href = url;
            };

            if (typeof modalGuardadoConSalida === "function") {
                const decision = await modalGuardadoConSalida({
                    titulo: esNuevo ? "Entrega registrada" : "Entrega guardada",
                    mensaje: result.mensaje || (esNuevo ? "Entrega registrada correctamente." : "Entrega guardada correctamente."),
                    pregunta: desdeCliente
                        ? "¿Querés volver al cliente o seguir editando esta entrega?"
                        : "¿Querés volver al listado de entregas o seguir editando?",
                    btnSalir: desdeCliente ? "Volver al cliente" : "Ir al listado",
                    btnQuedarse: "Seguir editando",
                    urlSalida: urlVolver
                });

                if (!decision?.salir) {
                    if (esNuevo) {
                        irAEdicion(result.id || 0);
                    } else if (CM.id > 0) {
                        // Recargar datos por si el servidor recalculó totales / cobros
                        await cargarEntrega(CM.id);
                        await cargarCobrosEntrega();
                    }
                }
                return;
            }

            exitoModal(result.mensaje || (esNuevo ? "Entrega registrada correctamente." : "Entrega guardada correctamente."));
            setTimeout(() => {
                window.location.href = urlVolver;
            }, 1000);
        } else {
            const msg = result.mensaje || "No se pudo guardar.";
            mostrarErrorEntrega(msg, inferirSeccionesErrorEntrega(msg));
        }
    }

    async function eliminarEntregaActual() {
        if (CM.id <= 0) return;

        const tieneCobros = (CM.cobrosLineas || []).some(p => p.IdCobro > 0) || cobrosActivos().length > 0;
        const msgCobros = tieneCobros
            ? " Tambien se revertiran los cobros (egresos de caja y cuenta corriente)."
            : "";
        const confirmado = await confirmarModal(
            `¿Eliminar esta entrega? Se revertira stock y deuda del contrato.${msgCobros}`);
        if (!confirmado) return;

        const r = await fetch(API.eliminar(CM.id), { method: "DELETE", headers: authHeaders() });
        const result = await r.json();
        const exito = result.valor === true || result.valor === "true" || result.ok === true;

        if (exito) {
            exitoModal(result.mensaje || "Entrega eliminada correctamente.");
            window.location.href = "/ClientesEntregas";
        } else {
            errorModal(result.mensaje || "No se pudo eliminar.");
        }
    }

    function fmtMoney(n) {
        const num = Number(n || 0);
        const partes = num.toFixed(2).split(".");
        const txt = typeof formatearMiles === "function"
            ? formatearMiles(partes[0] + "," + partes[1])
            : partes[0] + "," + partes[1];
        return "$ " + txt;
    }
})();
