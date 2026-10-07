let gridFirmas;
let modalFirma;
let firmaPad = null;
let firmaDirty = false;
let quitarFirma = false;

const columnConfigFirmas = [
    { index: 2, filterType: "text" }
];

registrarFiltrosGrilla("grd_Firmas", columnConfigFirmas);

$(document).ready(() => {
    modalFirma = new bootstrap.Modal(document.getElementById("modalEdicionFirma"));
    initFirmaPad();
    listaFirmas();

    $("#chkActivoFirma").on("change", function () {
        $("#lblActivoFirma").text(this.checked ? "Activo" : "Inactivo");
    });
});

function authFrm() {
    return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

async function listaFirmas() {
    const paginaActual = gridFirmas != null ? gridFirmas.page() : 0;
    const response = await fetch("/Firmas/Lista", { headers: authFrm() });
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    await configurarDataTableFirmas(data);
    if (paginaActual > 0) gridFirmas.page(paginaActual).draw("page");
}

async function configurarDataTableFirmas(data) {
    if (!gridFirmas) {
        gridFirmas = $("#grd_Firmas").DataTable({
            data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            autoWidth: false,
            columnDefs: typeof columnDefsGridLista === "function" ? columnDefsGridLista() : [],
            scrollX: true,
            scrollCollapse: true,
            columns: [
                columnaGridAcciones({
                    ver: "verFirma",
                    editar: "editarFirma",
                    eliminar: "eliminarFirma"
                }, "Firmas"),
                columnaGridId(),
                { data: "Nombre" },
                {
                    data: "FirmaUrl",
                    defaultContent: "",
                    orderable: false,
                    render: function (v, type, row) {
                        const url = v || row.FirmaUrl || "";
                        if (!url && !row.FirmaArchivo) return "—";
                        if (type === "export" || type === "print") return "Sí";
                        const src = url || `${row.FirmaArchivo}?v=${Date.now()}`;
                        return `<img class="frm-firma-thumb" src="${src}" alt="Firma" />`;
                    }
                },
                typeof columnaGridActivo === "function" ? columnaGridActivo("Firmas") : { data: "Activo" }
            ],
            createdRow: function (row, rowData) {
                if (typeof createdRowEstiloActivoGrilla === "function") {
                    createdRowEstiloActivoGrilla(row, rowData);
                }
            },
            dom: "Bfrtip",
            buttons: getBotonesExportacion(gridFirmas, "Firmas"),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                await initFiltrosGrillaListaEnInitComplete(api, "#grd_Firmas", columnConfigFirmas, {}, {
                    afterFilters: () => {
                        configurarMenuColumnasDataTable(gridFirmas, "#configColumnasMenu", "Firmas_Columnas", "#grd_Firmas");
                        $("#kpiCantFirmas").text(data.length);
                    }
                });
            }
        });
    } else {
        gridFirmas.clear().rows.add(data).draw();
        $("#kpiCantFirmas").text(Array.isArray(data) ? data.length : 0);
    }
}

function initFirmaPad() {
    const canvas = document.getElementById("canvasFirmaEmpresa");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const pos = (ev) => {
        const r = canvas.getBoundingClientRect();
        const x = (("clientX" in ev ? ev.clientX : ev.touches[0].clientX) - r.left) * (canvas.width / r.width);
        const y = (("clientY" in ev ? ev.clientY : ev.touches[0].clientY) - r.top) * (canvas.height / r.height);
        return { x, y };
    };

    let drawing = false;
    const start = (ev) => {
        ev.preventDefault();
        drawing = true;
        firmaDirty = true;
        quitarFirma = false;
        const p = pos(ev);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };
    const move = (ev) => {
        if (!drawing) return;
        ev.preventDefault();
        const p = pos(ev);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };
    const end = () => { drawing = false; };

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", end);
    canvas.addEventListener("pointercancel", end);

    $("#btnLimpiarFirmaEmpresa").on("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        firmaDirty = false;
    });
    $("#btnQuitarFirmaEmpresa").on("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        firmaDirty = false;
        quitarFirma = true;
    });
    $("#fileFirmaEmpresa").on("change", function () {
        const file = this.files && this.files[0];
        this.value = "";
        if (!file) return;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
            firmaDirty = true;
            quitarFirma = false;
        };
        img.src = URL.createObjectURL(file);
    });

    firmaPad = { canvas, ctx };
}

function canvasVacio() {
    const canvas = firmaPad?.canvas;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return false;
    }
    return true;
}

function nuevaFirma() {
    $("#txtIdFirma").val("0");
    $("#txtNombreFirma").val("");
    $("#chkActivoFirma").prop("checked", true).trigger("change");
    $("#modalEdicionFirmaLabel").text("Nueva firma");
    $("#btnGuardarFirma").text("Registrar");
    firmaPad?.ctx.clearRect(0, 0, firmaPad.canvas.width, firmaPad.canvas.height);
    firmaDirty = false;
    quitarFirma = false;
    modalFirma.show();
}

function verFirma(id) { editarFirma(id); }

async function editarFirma(id) {
    const response = await fetch(`/Firmas/EditarInfo?id=${id}`, { headers: authFrm() });
    if (!response.ok) {
        errorModal("No se pudo cargar la firma.");
        return;
    }
    const modelo = await response.json();
    $("#txtIdFirma").val(modelo.Id);
    $("#txtNombreFirma").val(modelo.Nombre || "");
    $("#chkActivoFirma").prop("checked", modelo.Activo !== false).trigger("change");
    $("#modalEdicionFirmaLabel").text("Editar firma");
    $("#btnGuardarFirma").text("Guardar");
    firmaPad?.ctx.clearRect(0, 0, firmaPad.canvas.width, firmaPad.canvas.height);
    firmaDirty = false;
    quitarFirma = false;
    if (modelo.FirmaUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = firmaPad.canvas;
            const ctx = firmaPad.ctx;
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        };
        img.src = modelo.FirmaUrl;
    }
    modalFirma.show();
}

async function guardarFirma() {
    const nombre = ($("#txtNombreFirma").val() || "").trim();
    if (!nombre) {
        errorModal("El nombre es obligatorio.");
        return;
    }
    const id = parseInt($("#txtIdFirma").val(), 10) || 0;
    const payload = {
        Id: id,
        Nombre: nombre,
        Activo: $("#chkActivoFirma").is(":checked"),
        QuitarFirma: quitarFirma,
        FirmaBase64: (!quitarFirma && firmaDirty && !canvasVacio()) ? firmaPad.canvas.toDataURL("image/png") : null
    };
    const url = id > 0 ? "/Firmas/Actualizar" : "/Firmas/Insertar";
    const method = id > 0 ? "PUT" : "POST";
    const response = await fetch(url, { method, headers: authFrm(), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!data?.valor) {
        errorModal(data?.mensaje || "No se pudo guardar.");
        return;
    }
    modalFirma.hide();
    if (typeof exitoModal === "function") exitoModal(data.mensaje || "Firma guardada.");
    await listaFirmas();
}

async function eliminarFirma(id) {
    if (typeof ejecutarEliminacionEntidad !== "function") {
        errorModal("No está disponible el asistente de eliminación.");
        return;
    }

    const resultado = await ejecutarEliminacionEntidad({
        entidadLabel: "esta firma",
        urlDependencias: `/Firmas/DependenciasEliminar?id=${id}`,
        urlEliminar: cascada => `/Firmas/Eliminar?id=${id}&cascada=${cascada ? "true" : "false"}`,
        headers: authFrm()
    });

    if (resultado.accion !== "ok") return;
    const data = resultado.data || {};
    if (typeof exitoModal === "function") exitoModal(data.mensaje || data.Mensaje || "Firma eliminada.");
    await listaFirmas();
}
