const axios = require("axios");

async function getMessageCentralToken() {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;
  const password = process.env.MESSAGE_CENTRAL_PASSWORD;
  const key = password; // Use base64 as stored in .env
  const email = process.env.MESSAGE_CENTRAL_EMAIL;
  const url = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${customerId}&key=${key}&scope=NEW&country=91&email=${email}`;

  // Debug print (DO NOT log password/key in production)
  console.log("MC getToken", { customerId, email, url });

  try {
    const res = await axios.get(url, { headers: { accept: "*/*" } });
    console.log("MC token response:", res.data);
    return res.data.token;
  } catch (error) {
    if (error.response) {
      console.error("Token error:", error.response.status, error.response.data);
    } else {
      console.error("Token error:", error.message);
    }
    throw error;
  }
}

async function sendMessageCentralSMS(phoneNumber, message) {
  const token = await getMessageCentralToken();
  const mobileNumber = phoneNumber
    .replace(/^\+?91/, "")
    .replace(/\D/g, "")
    .slice(-10);
  const data = {
    countryCode: "91",
    mobileNumber,
    flowType: "SMS",
    type: "SMS",
    messageType: "OTP",
    senderId: "UTOMOB", // Double check this is approved!
    message,
  };

  try {
    const res = await axios.post(
      "https://cpaas.messagecentral.com/verification/v3/send",
      data,
      {
        headers: {
          // Try this header first:
          Authorization: `Bearer ${token}`,
          // Or comment above, and uncomment below:
          // authToken: token,
          accept: "*/*",
        },
      }
    );
    console.log("SMS Response:", res.data);
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error(
        "Send SMS error:",
        error.response.status,
        error.response.data
      );
      // Print full details:
      console.error(
        "FULL ERROR DATA:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error("Send SMS error:", error.message);
    }
    throw error;
  }
}

module.exports = sendMessageCentralSMS;
