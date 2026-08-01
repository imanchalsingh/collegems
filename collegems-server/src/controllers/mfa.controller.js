import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import {
  generateTotpSecret,
  buildQrDataUrl,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
  remainingRecoveryCodes,
  isMfaEnforcedForRole,
} from "../utils/mfa.service.js";
import { logAction } from "../utils/auditService.js";

const MFA_TOKEN_TTL = process.env.MFA_TOKEN_EXPIRES_IN || "5m";

export function createMfaChallengeToken(user) {
  return jwt.sign(
    { id: String(user._id), purpose: "mfa_challenge", role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: MFA_TOKEN_TTL },
  );
}

export function verifyMfaChallengeToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== "mfa_challenge") {
    const err = new Error("Invalid MFA challenge token");
    err.status = 401;
    throw err;
  }
  return decoded;
}

export const getMfaStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "+mfaRecoveryCodes mfaEnabled",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      mfaEnabled: Boolean(user.mfaEnabled),
      recoveryCodesRemaining: remainingRecoveryCodes(user),
      enrollmentRequired: isMfaEnforcedForRole(user.role) && !user.mfaEnabled,
      enforcedForRole: isMfaEnforcedForRole(user.role),
    });
  } catch (error) {
    console.error("MFA status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const startMfaSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+mfaSecret +mfaTempSecret");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({
        message: "MFA is already enabled. Disable it before re-pairing.",
      });
    }

    const secret = generateTotpSecret(user.email);
    user.mfaTempSecret = secret.base32;
    await user.save({ validateBeforeSave: false });

    const qrCodeDataUrl = await buildQrDataUrl(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error("MFA setup start error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const confirmMfaSetup = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "TOTP token is required" });
    }

    const user = await User.findById(req.user.id).select(
      "+mfaSecret +mfaTempSecret +mfaRecoveryCodes",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.mfaTempSecret) {
      return res.status(400).json({
        message: "No MFA setup in progress. Start setup first.",
      });
    }

    const valid = verifyTotpToken(user.mfaTempSecret, token);
    if (!valid) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }

    const plainCodes = generateRecoveryCodes(8);
    user.mfaSecret = user.mfaTempSecret;
    user.mfaTempSecret = undefined;
    user.mfaEnabled = true;
    user.mfaRecoveryCodes = await hashRecoveryCodes(plainCodes);
    await user.save({ validateBeforeSave: false });

    await logAction(user._id, "MFA_ENABLED", "Auth", user._id, {
      role: user.role,
    });

    res.json({
      message: "MFA enabled successfully",
      mfaEnabled: true,
      recoveryCodes: plainCodes,
    });
  } catch (error) {
    console.error("MFA setup confirm error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const disableMfa = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "TOTP or recovery code is required" });
    }

    const user = await User.findById(req.user.id).select(
      "+password +mfaSecret +mfaRecoveryCodes",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ message: "MFA is not enabled" });
    }

    if (isMfaEnforcedForRole(user.role)) {
      return res.status(403).json({
        message: "MFA is mandatory for your role and cannot be disabled",
      });
    }

    if (password) {
      const { comparePassword } = await import("../utils/hashPassword.js");
      const ok = await comparePassword(password, user.password);
      if (!ok) {
        return res.status(400).json({ message: "Invalid password" });
      }
    }

    const totpOk = verifyTotpToken(user.mfaSecret, token);
    const recoveryOk = totpOk
      ? false
      : await consumeRecoveryCode(user, token);

    if (!totpOk && !recoveryOk) {
      return res.status(400).json({ message: "Invalid authenticator or recovery code" });
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaTempSecret = undefined;
    user.mfaRecoveryCodes = [];
    await user.save({ validateBeforeSave: false });

    await logAction(user._id, "MFA_DISABLED", "Auth", user._id, {
      role: user.role,
    });

    res.json({ message: "MFA disabled", mfaEnabled: false });
  } catch (error) {
    console.error("MFA disable error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const regenerateRecoveryCodes = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "TOTP token is required" });
    }

    const user = await User.findById(req.user.id).select(
      "+mfaSecret +mfaRecoveryCodes",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ message: "MFA is not enabled" });
    }

    if (!verifyTotpToken(user.mfaSecret, token)) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }

    const plainCodes = generateRecoveryCodes(8);
    user.mfaRecoveryCodes = await hashRecoveryCodes(plainCodes);
    await user.save({ validateBeforeSave: false });

    await logAction(user._id, "MFA_RECOVERY_REGENERATED", "Auth", user._id, {});

    res.json({
      message: "Recovery codes regenerated",
      recoveryCodes: plainCodes,
    });
  } catch (error) {
    console.error("MFA recovery regenerate error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
