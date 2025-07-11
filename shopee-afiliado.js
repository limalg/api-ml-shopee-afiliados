const axios = require("axios");
const crypto = require("crypto");

class ShopeeGraphQLAPI {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.baseUrl = "https://open-api.affiliate.shopee.com.br/graphql";
  }

  generateSignature(timestamp, payload = "") {
    const signString = `${this.appId}${timestamp}${payload}${this.appSecret}`;
    return crypto.createHash("sha256").update(signString).digest("hex");
  }

  async executeQuery(queryPayload) {
    const payloadStr = JSON.stringify(queryPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.generateSignature(timestamp, payloadStr);

    const headers = {
      Authorization: `SHA256 Credential=${this.appId}, Signature=${signature}, Timestamp=${timestamp}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.post(this.baseUrl, payloadStr, { headers });

      console.log("Request Details:");
      console.log("URL:", this.baseUrl);
      console.log("Headers:", headers);
      console.log("Payload:", payloadStr);
      console.log("Response Status:", response.status);
      console.log("Response Data:", response.data);

      return response.data;
    } catch (error) {
      return {
        error: true,
        status_code: error.response ? error.response.status : 500,
        message: error.message,
      };
    }
  }

  async generateShortLink(originUrl, subIds = ["s1", "s2", "s3", "s4", "s5"]) {
    const query = `
      mutation {
        generateShortLink(input: {
          originUrl: "${originUrl}",
          subIds: ${JSON.stringify(subIds)}
        }) {
          shortLink
        }
      }
    `;

    return await this.executeQuery({ query });
  }

}

// Exporta a classe para ser usada em outros arquivos
module.exports = ShopeeGraphQLAPI;

 // Example Usage
// (async () => {
//   const APP_ID = "18335990478"; // Replace with your actual app_id
//   const APP_SECRET = "I6P3OIVIMGADNR7AQEFV57PVFEOQPOOD";

//   const client = new ShopeeGraphQLAPI(APP_ID, APP_SECRET);

//   // Example product URL
//   const productUrl = "https://s.shopee.com.br/1B6fRQmnTx?share_channel_code=2";

//   // Generate short link
//   const subIds = ["lima", "maria", "marcos"];
//   const shortLink = await client.generateShortLink(productUrl, subIds);
//   console.log(JSON.stringify(shortLink, null, 2));
// })();
