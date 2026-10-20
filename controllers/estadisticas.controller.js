import db from "../firebase.js";
import PDFDocument from "pdfkit";


export const calcularEstadisticas = async () => {
  const snapshot = await db.collection("gatos").orderBy("fecha", "desc").get();

  const gatos = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (gatos.length === 0) {
    return {
      total: 0,
      promedioEdad: 0,
      promedioPeso: 0,
      edadMin: null,
      edadMax: null,
      pesoMin: null,
      pesoMax: null,
      porRaza: {},
      porMes: {},
      gatos,
    };
  }

  // Totales y promedios
  const total = gatos.length;
  const sumaEdad = gatos.reduce((acc, g) => acc + (Number(g.edad) || 0), 0);
  const sumaPeso = gatos.reduce((acc, g) => acc + (Number(g.peso) || 0), 0);

  const promedioEdad = Number((sumaEdad / total).toFixed(2));
  const promedioPeso = Number((sumaPeso / total).toFixed(2));

  // Mínimos y máximos
  const edades = gatos.map((g) => Number(g.edad) || 0);
  const pesos = gatos.map((g) => Number(g.peso) || 0);

  const edadMin = Math.min(...edades);
  const edadMax = Math.max(...edades);
  const pesoMin = Math.min(...pesos);
const pesoMax = Math.max(...pesos);

  // Distribución por raza
  const porRaza = {};
  gatos.forEach((g) => {
    const raza = g.raza || "Sin raza";
    porRaza[raza] = (porRaza[raza] || 0) + 1;
  });

  // Distribución por mes de registro (YYYY-MM)
  const porMes = {};
  gatos.forEach((g) => {
    if (!g.fecha) return;
    const fecha = new Date(g.fecha);
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    porMes[mes] = (porMes[mes] || 0) + 1;
  });

  return {
    total,
    promedioEdad,
    promedioPeso,
    edadMin,
    edadMax,
    pesoMin,
    pesoMax,
    porRaza,
    porMes,
    gatos, // también devolvemos la lista completa por si se necesita
  };
};

export const obtenerEstadisticas = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();

    const { gatos, ...resumen } = stats;

    res.status(200).json({
      mensaje: "Estadísticas generadas correctamente",
      ...resumen,
      // Si quieres incluir el detalle de razas con porcentaje:
      detalleRazas: Object.entries(stats.porRaza).map(([raza, cantidad]) => ({
        raza,
        cantidad,
        porcentaje: Number(((cantidad / stats.total) * 100).toFixed(1)),
      })),
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
mensaje: "Error al generar las estadísticas.",
      error: error.message,
    });
  }
};

export const exportarEstadisticasPDF = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();

    // Crear el documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "Estadísticas de Gatos",
        Author: "Sistema de Gatos",
      },
    });

    // Configurar headers para la descarga
    const nombreArchivo = `estadisticas-gatos-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    // Pipe el PDF directamente a la respuesta
    doc.pipe(res);

    // ========== ESTILOS Y COLORES ==========
    const colorPrincipal = "#4472C4";
    const colorSecundario = "#5B9BD5";
    const colorTexto = "#333333";

    // ========== TÍTULO ==========
    doc
      .fontSize(22)
 .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Estadísticas de Gatos", { align: "center" });

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica")
      .text(`Generado el: ${new Date().toLocaleString("es-ES")}`, {
        align: "center",
      });

    doc.moveDown(1.5);

    // ========== RESUMEN GENERAL ==========
    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Resumen General");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    const resumen = [
      ["Total de gatos", stats.total],
      ["Promedio de edad", `${stats.promedioEdad} años`],
      ["Promedio de peso", `${stats.promedioPeso} kg`],
      ["Edad mínima", stats.edadMin !== null ? `${stats.edadMin} años` : "—"],
      ["Edad máxima", stats.edadMax !== null ? `${stats.edadMax} años` : "—"],
      ["Peso mínimo", stats.pesoMin !== null ? `${stats.pesoMin} kg` : "—"],
      ["Peso máximo", stats.pesoMax !== null ? `${stats.pesoMax} kg` : "—"],
    ];

    resumen.forEach(([label, valor]) => {
      doc
        .fontSize(11)
        .fillColor(colorTexto)
        .font("Helvetica-Bold")
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .text(String(valor));
      doc.moveDown(0.3);
    });
doc.moveDown(1);

    // ========== DISTRIBUCIÓN POR RAZA ==========
    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Distribución por Raza");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    if (Object.keys(stats.porRaza).length === 0) {
      doc.fontSize(11).fillColor("#666").text("No hay datos de razas.");
    } else {
      // Encabezado de tabla
      const startY = doc.y;
      doc
        .fontSize(10)
        .fillColor("#FFFFFF")
        .rect(50, startY, 495, 22)
        .fill(colorSecundario);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text("Raza", 60, startY + 6)
        .text("Cantidad", 300, startY + 6)
        .text("Porcentaje", 420, startY + 6);

      doc.y = startY + 28;

      // Filas
      const razasOrdenadas = Object.entries(stats.porRaza).sort(
        (a, b) => b[1] - a[1]
      );

      razasOrdenadas.forEach(([raza, cantidad], index) => {
        const porcentaje =
          stats.total > 0
            ? ((cantidad / stats.total) * 100).toFixed(1)
            : "0.0";

        // Fondo alternado
        if (index % 2 === 0) {
doc.rect(50, doc.y - 4, 495, 20).fill("#F2F2F2");
        }

        doc
          .fillColor(colorTexto)
          .font("Helvetica")
          .fontSize(10)
          .text(raza, 60, doc.y)
          .text(String(cantidad), 300, doc.y)
          .text(`${porcentaje}%`, 420, doc.y);

        doc.moveDown(0.7);
      });
    }

    doc.moveDown(1.2);

    // ========== REGISTROS POR MES ==========
    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Gatos registrados por mes");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    if (Object.keys(stats.porMes).length === 0) {
      doc.fontSize(11).fillColor("#666").text("No hay datos por mes.");
    } else {
      const mesesOrdenados = Object.entries(stats.porMes).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      mesesOrdenados.forEach(([mes, cantidad]) => {
        doc
          .fontSize(11)
          .fillColor(colorTexto)
          .font("Helvetica-Bold")
          .text(`${mes}: `, { continued: true })
          .font("Helvetica")
          .text(`${cantidad} gato(s)`);
        doc.moveDown(0.3);
      });
    }
 // ========== PIE DE PÁGINA ==========
    const rangoPaginas = doc.bufferedPageRange();
    for (let i = 0; i < rangoPaginas.count; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor("#999999")
        .text(
          `Página ${i + 1} de ${rangoPaginas.count}  |  Sistema de Gatos`,
          50,
          doc.page.height - 40,
          { align: "center", width: 495 }
        );
    }

    // Finalizar el documento
    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    // Si ya se enviaron headers, no se puede enviar JSON
    if (!res.headersSent) {
      res.status(500).json({
        mensaje: "Error al generar el archivo PDF.",
        error: error.message,
      });
    }
  }
};
