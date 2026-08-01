import crypto from "crypto";
import AlumniDonation from "../models/AlumniDonation.model.js";
import Alumni from "../models/Alumni.model.js";

const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
};

const createRazorpayOrder = async ({ amount, currency, receipt }) => {
  const creds = getRazorpayCredentials();
  if (!creds) return null;

  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString(
    "base64"
  );
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes: { purpose: "alumni_donation" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay order failed: ${errorText}`);
  }

  return response.json();
};

export const createDonationCheckout = async (req, res, next) => {
  try {
    const { amount, fund, message, currency = "INR" } = req.body;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Donation amount must be at least 1",
      });
    }

    const alumniProfile = await Alumni.findOne({ userId: req.user.id });
    const donation = await AlumniDonation.create({
      donor: req.user.id,
      alumniProfile: alumniProfile?._id,
      amount: numericAmount,
      currency,
      fund: fund || "college_development",
      message: message?.trim() || "",
      status: "created",
    });

    const receipt = `alumni_don_${donation._id.toString().slice(-10)}`;

    try {
      const razorpayOrder = await createRazorpayOrder({
        amount: numericAmount,
        currency,
        receipt,
      });

      if (razorpayOrder) {
        donation.provider = "razorpay";
        donation.orderId = razorpayOrder.id;
        donation.status = "pending";
        await donation.save();

        return res.status(201).json({
          success: true,
          data: {
            donationId: donation._id,
            orderId: razorpayOrder.id,
            amount: numericAmount,
            currency,
            provider: "razorpay",
            keyId: process.env.RAZORPAY_KEY_ID,
            fund: donation.fund,
          },
        });
      }
    } catch (razorpayError) {
      console.error("Razorpay checkout error:", razorpayError.message);
    }

    // Demo checkout when Razorpay keys are missing or order creation fails
    donation.provider = "demo";
    donation.orderId = `demo_order_${donation._id}`;
    donation.status = "pending";
    await donation.save();

    res.status(201).json({
      success: true,
      data: {
        donationId: donation._id,
        orderId: donation.orderId,
        amount: numericAmount,
        currency,
        provider: "demo",
        fund: donation.fund,
        message:
          "Demo checkout mode active. Confirm payment to complete donation.",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const confirmDonationPayment = async (req, res, next) => {
  try {
    const { donationId, paymentId, orderId, signature } = req.body;

    const donation = await AlumniDonation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to confirm this donation",
      });
    }

    if (donation.status === "paid") {
      return res.json({ success: true, data: donation });
    }

    if (donation.provider === "razorpay") {
      const creds = getRazorpayCredentials();
      if (!creds) {
        return res.status(503).json({
          success: false,
          message: "Payment verification is not configured",
        });
      }

      const expected = crypto
        .createHmac("sha256", creds.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (expected !== signature) {
        donation.status = "failed";
        await donation.save();
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature",
        });
      }

      donation.paymentId = paymentId;
      donation.orderId = orderId;
      donation.paymentSignature = signature;
      donation.status = "paid";
      await donation.save();

      return res.json({ success: true, data: donation });
    }

    // Demo provider confirmation (local / OSS contribution without live keys)
    donation.paymentId = paymentId || `demo_pay_${Date.now()}`;
    donation.status = "paid";
    await donation.save();

    res.json({
      success: true,
      data: donation,
      message: "Demo donation marked as paid",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyDonations = async (req, res, next) => {
  try {
    const donations = await AlumniDonation.find({ donor: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: donations });
  } catch (error) {
    next(error);
  }
};

export const getDonationStats = async (req, res, next) => {
  try {
    const [totals] = await AlumniDonation.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          donationCount: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalAmount: totals?.totalAmount || 0,
        donationCount: totals?.donationCount || 0,
        currency: "INR",
      },
    });
  } catch (error) {
    next(error);
  }
};
