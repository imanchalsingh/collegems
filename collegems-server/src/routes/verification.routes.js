import express from "express";
import {
  issueCertificate,
  verifyCertificatePublic,
  detectTamper,
  downloadCertificatePdf,
  getSigningPublicKey,
  listIssuedCertificates,
} from "../controllers/verification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

// Public third-party verification (no auth)
router.get("/verify-certificate/:certId", verifyCertificatePublic);
router.post("/verify-certificate/:certId", verifyCertificatePublic);
router.post("/verify-certificate/:certId/tamper-check", detectTamper);
router.get("/verify-certificate/:certId/pdf", downloadCertificatePdf);
router.get("/verification/public-key", getSigningPublicKey);

// Issuer endpoints (HOD / admin)
router.post(
  "/verification/issue",
  authenticate,
  allowRoles("hod", "admin"),
  issueCertificate,
);
router.get(
  "/verification/certificates",
  authenticate,
  allowRoles("hod", "admin"),
  listIssuedCertificates,
);

export default router;
