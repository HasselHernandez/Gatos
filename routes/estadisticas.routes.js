import express from "express";
import { obtenerEstadisticas } from "../controllers/estadisticas.controller.js";
import { exportarEstadisticasExcel } from "../controllers/exportacion.controller.js";
import { capturarInfoSolicitud } from "../middlewares/auditoria.js";
import { exportarEstadisticasExcel, exportarEstadisticasPDF } from "../controllers/exportacion.controller.js";
import { exportarGatosCSV } from "../controllers/export.controller.js";


const router = express.Router();

router.use(capturarInfoSolicitud);

// Estadísticas en JSON
router.get("/estadisticas", obtenerEstadisticas);

// Descarga el archivo Excel
router.get("/estadisticas/excel", exportarEstadisticasExcel);

// Descarga el PDF
router.get("/estadisticas/pdf", exportarEstadisticasPDF);

// Descarga el CSV de gatos
router.get("/gatos/csv", exportarGatosCSV);



export default router;
