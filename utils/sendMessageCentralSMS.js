const axios = require("axios");

async function getMessageCentralToken() {
  const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;
  const password = process.env.MESSAGE_CENTRAL_PASSWORD;
  const key = Buffer.from(password).toString('base64');
  const email = process.env.MESSAGE_CENTRAL_EMAIL;
  const url = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${customerId}&key=${key}&scope=NEW&country=91&email=${email}`;
  
  // Debug print (mask password in logs!)
  console.log("MC getToken", { customerId, email, key, url });
  
  try {
    const res = await axios.get(url, { headers: { accept: "*/*" } });
    // Debug print
    console.log("MC token response:", res.data);
    return res.data.token;
  } catch (error) {
    // Print error response for debugging
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
  const data = {
    countryCode: "91",
    mobileNumber: phoneNumber.replace(/^\+?91/, ""), // Ensure just 10 digits
    flowType: "SMS",
    type: "SMS",
    messageType: "OTP",
    senderId: "UTOMOB", // <-- This must match your account's approved Sender ID
    message,
  };

  try {
    const res = await axios.post(
      "https://cpaas.messagecentral.com/verification/v3/send",
      data,
      { headers: { authToken: token } }
    );
    console.log("SMS Response:", res.data);
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error("Send SMS error:", error.response.status, error.response.data);
    } else {
      console.error("Send SMS error:", error.message);
    }
    throw error;
  }
}


module.exports = sendMessageCentralSMS;
