const config = require("../config.json");
const logger = require("../utils/logger");
const OfferDirect = require("../models/OfferDirect");

const apiKey = config.OPENAI_API_KEY;
const gptModel = config.OPENAI_GPT_MODEL;

const generatePromptString = async (offers, directOffer) => {

  const promptArray = offers.map((offer) => {
    const status = offer.status === "ACCEPTED" ? "Y" : "N";
    return `${offer.price}${status}`;
  });

  const promptString = promptArray.join(",").concat(`,${directOffer.price}`);
  return promptString;
};

exports.makeOfferDecisionWithChatGpt = async (provider, directOffer) => {
  const offers = await OfferDirect.find({ buyer: provider.account.id }).populate('');
  const promptString = await generatePromptString(offers, directOffer);

  const data = {
    prompt: promptString,
    max_tokens: 60,
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  };

  try {
    const response = await fetch(
      `https://api.openai.com/v1/engines/${gptModel}/completions`,
      options
    );

    if (!response.ok) {
      throw new Error(`API request failed with status code ${response.status}`);
    }

    const jsonResponse = await response.json();
    const textResponse = jsonResponse.choices[0].text.trim();

    if (textResponse.toLowerCase() === "Y") {
      return "accept";
    } else if (textResponse.toLowerCase() === "N") {
      return "reject";
    } else {
      logger.error("Response is not a clear true/false answer:", textResponse);
      return;
    }
  } catch (error) {
    logger.error("Error:", error);
  }
};
