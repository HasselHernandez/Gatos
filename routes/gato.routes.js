import express from "express";
import multer from "multer";
import { registrarGato, 
  obtenerGatos, 
  actualizarGato, 
  eliminarGato, 
  buscarGatos,
  enviarGatosPorEmail } from "../controllers/gato.controller.js";

import { capturarInfoSolicitud } from "../middlewares/auditoria.js";



const router = express.Router();

// Debajo de const router = express.Router();
router.use(capturarInfoSolicitud);   // aplica a todas las rutas de este router

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/gato",
  upload.single("imagen"),
  registrarGato
);

router.put(
  "/gato/:id",
  upload.single("imagen"),
  actualizarGato
);

router.get("/gatos", obtenerGatos);

router.delete("/gato/:id", eliminarGato);

router.get("/gatos/buscar", buscarGatos);

router.get('/gatos/enviar-email', enviarGatosPorEmail);

export default router;