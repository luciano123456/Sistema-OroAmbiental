/* Generacion Word desde plantillas .docx - campos {entre llaves} */

(function (window) {
    "use strict";

    const API_DOC = {
        datosPlantilla: id => `/Contratos/DatosPlantilla?id=${id}`,
        plantillaDescargar: (idTipo, nombre) =>
            `/ContratosPlantillas/Descargar?idTipoContrato=${idTipo}&nombre=${encodeURIComponent(nombre || "")}`,
        documentosLista: id => `/ContratosDocumentos/Lista?idContrato=${id}`,
        documentoDescargar: id => `/ContratosDocumentos/Descargar?id=${id}`,
        documentoGuardar: (idContrato, idTipo, formato) =>
            `/ContratosDocumentos/Guardar?idContrato=${idContrato}&idTipoContrato=${idTipo || 0}&formato=${encodeURIComponent(formato || "")}`,
        documentoEliminar: id => `/ContratosDocumentos/Eliminar?id=${id}`,
        generar: (idContrato, idTipo, formato) =>
            `/ContratosDocumentos/Generar?idContrato=${idContrato}&idTipoContrato=${idTipo}&formato=${encodeURIComponent(formato || "word")}`,
        tiposContrato: "/TiposContratos/Lista"
    };

    function resolveToken() {
        if (window.token) return window.token;
        try {
            if (typeof token !== "undefined" && token) return token;
        } catch (_) { /* otro scope */ }
        return localStorage.getItem("JwtToken") || "";
    }

    function authHeaders(json = true) {
        const jwt = resolveToken();
        const h = {};
        if (jwt) h.Authorization = "Bearer " + jwt;
        if (json) h["Content-Type"] = "application/json";
        return h;
    }

    async function fetchApiErrorMessage(r, fallback) {
        try {
            const j = await r.json();
            return j.mensaje || j.message || j.title || fallback;
        } catch {
            return fallback;
        }
    }

    function fmtFecha(d) {
        if (!d) return "";
        const f = new Date(d);
        if (isNaN(f.getTime())) return "";
        return f.toLocaleDateString("es-AR");
    }

    function partesFecha(d) {
        const f = d ? new Date(d) : new Date();
        if (isNaN(f.getTime())) return { dia: "", mes: "", mesNombre: "", anio: "" };
        const mesNombre = f.toLocaleString("es-AR", { month: "long" });
        return {
            dia: String(f.getDate()),
            mes: String(f.getMonth() + 1),
            mesNombre: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
            anio: String(f.getFullYear())
        };
    }

    function sanitizeFileName(name) {
        return String(name || "Contrato")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w-]/gi, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "")
            .substring(0, 60) || "Contrato";
    }

    /** CONTRATO_NombreCliente_yyyyMMdd */
    function buildNombreArchivoContrato(d) {
        d = d || {};
        const cliente = sanitizeFileName(
            d.NombreCliente || d.nombreCliente || d.Cliente || d.cliente || d.Generador || "Cliente"
        );
        let fecha = "";
        const fc = d.FechaContrato || d.fechaContrato;
        if (fc) {
            const f = new Date(fc);
            if (!isNaN(f.getTime())) {
                fecha = f.toISOString().slice(0, 10).replace(/-/g, "");
            }
        }
        if (!fecha) {
            fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        }
        return `CONTRATO_${cliente}_${fecha}`;
    }

    function nombreDisplayDocumento(nombreArchivo) {
        const n = String(nombreArchivo || "");
        const m = n.match(/^\d{8}_\d{6}_(.+)$/);
        return m ? m[1] : n;
    }

    async function descargarBlobComoArchivo(url, nombreDescarga) {
        const r = await fetch(url, { method: "GET", headers: authHeaders(false) });
        if (!r.ok) {
            const msg = await fetchApiErrorMessage(r, "No se pudo descargar el archivo.");
            throw new Error(msg);
        }
        const blob = await r.blob();
        const disp = r.headers.get("Content-Disposition") || "";
        let nombre = nombreDescarga || "";
        const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disp);
        if (match?.[1]) {
            try {
                nombre = decodeURIComponent(match[1].trim());
            } catch {
                nombre = match[1].trim();
            }
        }
        if (!nombre) nombre = "Contrato.docx";

        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = nombre;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 500);
    }

    /** Une etiquetas Word partidas entre varios &lt;w:t&gt; y corrige {|X|}, [X|}, etc. */
    function limpiarInteriorEtiqueta(inner) {
        return inner
            .replace(/<\/w:t>\s*<\/w:r>\s*<w:r[^>]*>\s*(?:<w:rPr[^/]*\/>?\s*)*<w:t[^>]*>/gi, "")
            .replace(/\|/g, "")
            .replace(/<[^>]+>/g, "")
            .trim();
    }

    function normalizarContratoDocumentXml(xml) {
        let s = xml;

        s = s.replace(/\{((?:[^{}]|<[^>]+>)*)\}/g, (m, inner) => "{" + limpiarInteriorEtiqueta(inner) + "}");
        s = s.replace(/\[((?:[^\[\]]|<[^>]+>)*)\]/g, (m, inner) => "{" + limpiarInteriorEtiqueta(inner) + "}");

        s = s.replace(/\{\|/g, "{");
        s = s.replace(/\|\}/g, "}");
        s = s.replace(/\[([A-Za-z0-9_]+)\|\}/g, "{$1}");
        s = s.replace(/\{\|([A-Za-z0-9_]+)\]/g, "{$1}");
        s = s.replace(/PROFESION\|CLIENTE/gi, "PROFESIONCLIENTE");

        return s;
    }

    function normalizarContratoDocxZip(zip) {
        const file = zip.file("word/document.xml");
        if (!file) return zip;
        zip.file("word/document.xml", normalizarContratoDocumentXml(file.asText()));
        return zip;
    }

    /**
     * Campos del Word "CONTRATO PARA CLIENTES 2026" (tras normalizar → {ETIQUETA}).
     */
    function buildContratoData(d) {
        d = d || {};
        const safe = x => (x == null ? "" : String(x).trim());

        const fechaFirma = d.FechaContrato || d.fechaContrato || new Date();
        const fc = partesFecha(fechaFirma);
        const fechaInicioRaw = d.FechaInicio || d.fechaInicio;
        const fi = partesFecha(fechaInicioRaw || fechaFirma);
        const fv = partesFecha(d.FechaVencimiento || d.fechaVencimiento);
        const hoy = partesFecha(new Date());

        const nombreCliente = safe(d.NombreCliente || d.nombreCliente || d.Cliente || d.cliente || d.Generador);
        const establecimiento = safe(d.Establecimiento || d.establecimiento);
        const domicilio = safe(d.DomicilioCliente || d.domicilioCliente || d.DomicilioGenerador || d.DomicilioEstablecimiento);
        const localidad = safe(d.LocalidadCliente || d.localidadCliente || d.LocalidadGenerador);
        const telefono = safe(d.TelefonoCliente || d.telefonoCliente || d.TelefonoGenerador);
        const email = safe(d.EmailCliente || d.emailCliente || d.EmailGenerador);
        const cuit = safe(d.CuitCliente || d.cuitCliente || d.CuitGenerador);
        const profesion = safe(d.ProfesionCliente || d.profesionCliente || d.Profesion || d.profesion);
        const tipoGenerador = safe(
            d.TipoGeneradorCliente || d.tipoGeneradorCliente || d.TipoGenerador || d.tipoGenerador
        ) || profesion;
        const iva = safe(d.IvaCliente || d.ivaCliente || d.CondicionIvaCliente || d.condicionIvaCliente);
        const diasHorarios = safe(d.DiasHorariosCliente || d.diasHorariosCliente || d.DiaRecoleccion);

        const nombreArchivo = buildNombreArchivoContrato(d);
        const empresa = safe(d.Empresa) || "ORO AMBIENTAL GROUP S.R.L.";
        const ciudad = safe(d.Ciudad) || "Buenos Aires";

        const data = {
            /* Encabezado plantilla Oro Ambiental 2026 */
            NOMBRECLIENTE: nombreCliente,
            DOMICILIOCLIENTE: domicilio,
            LOCALIDADCLIENTE: localidad,
            TELEFONOCLIENTE: telefono,
            CUITCLIENTE: cuit,
            TIPOGENERADORCLIENTE: tipoGenerador,
            TIPOGENERADOR: tipoGenerador,
            /* Alias histórico en plantillas viejas */
            PROFESIONCLIENTE: tipoGenerador || profesion,
            IVACLIENTE: iva,
            DIASCLIENTE: diasHorarios,
            EMAILCLIENTE: email,

            /* Pie de firma: {DIA} {MES} {ANIO} = fecha inicio del contrato */
            DIA: fi.dia,
            MES: fi.mesNombre,
            ANIO: fi.anio,
            DIAINICIO: fi.dia,
            MESINICIO: fi.mesNombre,
            ANIOINICIO: fi.anio,
            FECHAINICIO: fmtFecha(fechaInicioRaw || fechaFirma),

            /* Alias compatibles */
            NombreCliente: nombreCliente,
            Cliente: nombreCliente,
            Generador: nombreCliente,
            GENERADOR: nombreCliente,
            DomicilioCliente: domicilio,
            Domicilio: domicilio,
            DOMICILIO: domicilio,
            Localidad: localidad,
            LocalidadCliente: localidad,
            Telefono: telefono,
            TelefonoCliente: telefono,
            Email: email,
            EmailCliente: email,
            CuitCliente: cuit,
            CUIT: cuit,
            Profesion: profesion,
            ProfesionCliente: profesion,
            TipoGenerador: tipoGenerador,
            TipoGeneradorCliente: tipoGenerador,
            CondicionIva: iva,
            IvaCliente: iva,
            DiasHorariosCliente: diasHorarios,
            DiaRecoleccion: safe(d.DiaRecoleccion),
            SemanaRecoleccion: safe(d.SemanaRecoleccion),
            HorarioRecoleccion: safe(d.HorarioRecoleccion),

            Establecimiento: establecimiento,
            Empresa: empresa,
            EMPRESA: empresa,
            OperadorNumero: safe(d.OperadorNumero) || "7566",
            OPERADOR: safe(d.OperadorNumero) || "7566",
            Ciudad: ciudad,
            CIUDAD: ciudad,

            FechaContrato: fmtFecha(fechaFirma),
            FechaInicio: fmtFecha(d.FechaInicio || d.fechaInicio),
            FechaVencimiento: fmtFecha(d.FechaVencimiento || d.fechaVencimiento),
            DiaContrato: fc.dia,
            MesContrato: fc.mesNombre,
            AnioContrato: fc.anio,
            DiaInicio: fi.dia,
            MesInicio: fi.mesNombre,
            AnioInicio: fi.anio,
            DiaVencimiento: fv.dia,
            MesVencimiento: fv.mesNombre,
            AnioVencimiento: fv.anio,
            DiaHoy: hoy.dia,
            MesHoy: hoy.mesNombre,
            AnioHoy: hoy.anio,

            IdContrato: safe(d.Id || d.id),
            NumeroContrato: safe(d.Id || d.id),
            TipoContrato: safe(d.TipoContrato || d.tipoContrato),
            Sucursal: safe(d.Sucursal || d.sucursal),
            Vigente: (d.Vigente === true || d.vigente === true) ? "Si" : "No",
            NombreArchivo: nombreArchivo
        };

        return data;
    }

    async function fetchContratoTemplate(idTipoContrato, fallbackName) {
        const r = await fetch(API_DOC.plantillaDescargar(idTipoContrato, fallbackName), {
            method: "GET",
            headers: authHeaders(false)
        });
        if (!r.ok) {
            const msg = await fetchApiErrorMessage(
                r,
                "No existe plantilla .docx para este tipo. Subila en Configuraciones → Plantillas Word."
            );
            throw new Error(msg);
        }
        return await r.arrayBuffer();
    }

    function renderDocxFromTemplate(arrayBuffer, data) {
        let zip = new PizZip(arrayBuffer);
        zip = normalizarContratoDocxZip(zip);

        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => "",
            delimiters: { start: "{", end: "}" }
        });
        try {
            doc.render(data);
        } catch (err) {
            const det = err.properties?.errors
                ?.map(e => e.properties?.explanation || e.message)
                .filter(Boolean)
                .join("; ");
            throw new Error(det || "Error al reemplazar campos en la plantilla Word.");
        }
        return doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
    }

    async function guardarDocumentoEnServidor(idContrato, idTipoContrato, formato, blob, nombreArchivo) {
        const fd = new FormData();
        const ext = formato === "pdf" ? ".pdf" : ".docx";
        fd.append("file", blob, `${nombreArchivo}${ext}`);

        const r = await fetch(API_DOC.documentoGuardar(idContrato, idTipoContrato, formato), {
            method: "POST",
            headers: { Authorization: "Bearer " + resolveToken() },
            body: fd
        });
        return await r.json();
    }

    async function exportarContratoDocumento(opts) {
        const idContrato = Number(opts.idContrato || 0);
        const idTipoContrato = Number(opts.idTipoContrato || 0);
        const tipo = (opts.formato || "word").toLowerCase();

        if (idContrato <= 0) {
            throw new Error("Guarda el contrato antes de generar el documento.");
        }
        if (idTipoContrato <= 0) {
            throw new Error("Selecciona el tipo de contrato (plantilla).");
        }

        if (typeof opts.onProgress === "function") {
            opts.onProgress("Generando contrato Word en el servidor...");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        try {
            const r = await fetch(API_DOC.generar(idContrato, idTipoContrato, tipo), {
                method: "POST",
                headers: authHeaders(false),
                signal: controller.signal
            });

            const res = await r.json();
            if (!res.valor) {
                throw new Error(res.mensaje || "No se pudo generar el documento.");
            }

            if (!opts.sinModalExito && typeof exitoModal === "function") {
                exitoModal(res.mensaje || "Contrato generado.");
            }

            return {
                ok: true,
                id: Number(res.id || res.Id || 0),
                nombre: res.nombreArchivo || res.NombreArchivo || ""
            };
        } catch (err) {
            if (err.name === "AbortError") {
                throw new Error("La generacion tardo demasiado. Proba con Word o reintenta.");
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function descargarDocumentoContrato(id, nombreSugerido) {
        const idDoc = Number(id || 0);
        if (idDoc <= 0) return;
        await descargarBlobComoArchivo(
            API_DOC.documentoDescargar(idDoc),
            nombreSugerido || "Contrato.docx"
        );
    }

    const DOC_NUEVO_MS = 5000;
    let _timeoutResaltarDoc = null;

    function resaltarDocumentoNuevo($container, idDocumento) {
        const id = Number(idDocumento || 0);
        if (!$container?.length || id <= 0) return;

        if (_timeoutResaltarDoc) {
            clearTimeout(_timeoutResaltarDoc);
            _timeoutResaltarDoc = null;
        }

        $container.find(".rp-doc-item--nuevo").removeClass("rp-doc-item--nuevo");
        $container.find(".rp-doc-badge-nuevo").remove();

        const $item = $container.find(`.rp-doc-item[data-id="${id}"]`);
        if (!$item.length) return;

        $item.addClass("rp-doc-item--nuevo");
        const $titulo = $item.find(".rp-doc-body strong").first();
        if ($titulo.length && !$titulo.find(".rp-doc-badge-nuevo").length) {
            $titulo.append('<span class="rp-doc-badge-nuevo">Nuevo</span>');
        }

        const el = $item[0];
        if (el?.scrollIntoView) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        _timeoutResaltarDoc = setTimeout(() => {
            $item.removeClass("rp-doc-item--nuevo");
            $item.find(".rp-doc-badge-nuevo").remove();
            _timeoutResaltarDoc = null;
        }, DOC_NUEVO_MS);
    }

    async function cargarListaDocumentosContrato(idContrato, $container, idDestacar) {
        if (!$container?.length || idContrato <= 0) {
            $container?.html(`<div class="rp-sub-empty"><p>Guarda el contrato para ver documentos adjuntos.</p></div>`);
            return;
        }

        const r = await fetch(API_DOC.documentosLista(idContrato), { headers: authHeaders(false) });
        if (!r.ok) {
            const msg = await fetchApiErrorMessage(
                r,
                r.status === 401
                    ? "Sesion expirada."
                    : "No se pudieron cargar los documentos adjuntos."
            );
            $container.html(`<div class="text-danger small">${escapeHtml(msg)}</div>`);
            return;
        }

        const lista = await r.json();
        if (!lista.length) {
            $container.html(`<div class="rp-sub-empty"><i class="fa fa-folder-open-o"></i><p>Sin documentos adjuntos. Usa Generar Word para crear uno.</p></div>`);
            return;
        }

        const idHighlight = Number(idDestacar || 0);

        const html = lista.map(d => {
            const tam = Number(d.TamanioBytes || 0);
            const kb = tam > 0 ? `${Math.round(tam / 1024)} KB` : "";
            const fecha = d.FechaUsuarioRegistra
                ? new Date(d.FechaUsuarioRegistra).toLocaleString("es-AR")
                : "";
            const nombreMostrar = nombreDisplayDocumento(d.NombreArchivo);
            const nombreDescarga = nombreMostrar || d.NombreArchivo || "Contrato";
            const esNuevo = idHighlight > 0 && Number(d.Id) === idHighlight;
            const claseNuevo = esNuevo ? " rp-doc-item--nuevo" : "";
            const badgeNuevo = esNuevo ? '<span class="rp-doc-badge-nuevo">Nuevo</span>' : "";
            return `
                <div class="rp-doc-item${claseNuevo}" data-id="${d.Id}">
                    <div class="rp-doc-icon"><i class="fa fa-file-${(d.Extension || "").includes("pdf") ? "pdf" : "word"}-o"></i></div>
                    <div class="rp-doc-body">
                        <strong>${escapeHtml(nombreMostrar)}${badgeNuevo}</strong>
                        <div class="small text-muted">${escapeHtml(d.Formato || "")} · ${kb} · ${fecha}</div>
                    </div>
                    <div class="rp-doc-actions">
                        <button type="button" class="btn btn-sm btn-outline-light btn-doc-descargar" data-id="${d.Id}" data-nombre="${escapeHtml(nombreDescarga)}" title="Descargar">
                            <i class="fa fa-download"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-doc-eliminar" data-id="${d.Id}" title="Eliminar">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join("");

        $container.html(html);

        if (idHighlight > 0) {
            requestAnimationFrame(() => resaltarDocumentoNuevo($container, idHighlight));
        }
    }

    function escapeHtml(t) {
        return String(t ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    window.ContratosDocumentos = {
        API_DOC,
        buildContratoData,
        buildNombreArchivoContrato,
        exportarContratoDocumento,
        descargarDocumentoContrato,
        cargarListaDocumentosContrato,
        resaltarDocumentoNuevo,
        fetchContratoTemplate,
        renderDocxFromTemplate
    };
})(window);
