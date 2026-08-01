import User from "../models/User.model.js";
import { isMfaEnforcedForRole } from "../utils/mfa.service.js";

/**
 * Blocks access for roles that must have MFA enabled when MFA_ENFORCE_STRICT=true.
 * Attach after `authenticate` on sensitive routers.
 */
export const mfaGuard = async (req, res, next) => {
  try {
    if (process.env.MFA_ENFORCE_STRICT !== "true") {
      return next();
    }

    const role = req.user?.role;
    if (!isMfaEnforcedForRole(role)) {
      return next();
    }

    const user = await User.findById(req.user.id).select("mfaEnabled role");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.mfaEnabled) {
      return res.status(403).json({
        message: "Multi-factor authentication enrollment is required for your role",
        mfaEnrollmentRequired: true,
      });
    }

    return next();
  } catch (error) {
    console.error("mfaGuard error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Validates TOTP/recovery during the MFA login challenge step.
 * Expects req.body.token (TOTP or recovery) and a verified challenge user on req.mfaUser.
 */
export const validateMfaLoginCode = async (req, res, next) => {
  try {
    const { verifyTotpToken, consumeRecoveryCode } = await import(
      "../utils/mfa.service.js"
    );
    const code = req.body?.token || req.body?.code || req.body?.totp;
    if (!code) {
      return res.status(400).json({ message: "Authenticator or recovery code required" });
    }

    const user = req.mfaUser;
    if (!user) {
      return res.status(401).json({ message: "MFA challenge missing" });
    }

    const totpOk = verifyTotpToken(user.mfaSecret, code);
    if (totpOk) {
      req.mfaMethod = "totp";
      return next();
    }

    const recoveryOk = await consumeRecoveryCode(user, code);
    if (recoveryOk) {
      req.mfaMethod = "recovery";
      return next();
    }

    return res.status(400).json({ message: "Invalid authenticator or recovery code" });
  } catch (error) {
    console.error("validateMfaLoginCode error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
