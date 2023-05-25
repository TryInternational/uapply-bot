const express = require("express");
const { Client, Message } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const { createReadStream } = require("fs");

// Define the questions and options
const questions = [
  {
    question: "Question 1: What is your favorite color?",
    options: ["Red", "Blue", "Green"],
  },
  {
    question: "Question 2: How old are you?",
    options: ["Under 18", "18-25", "26-35", "36+"],
  },
  {
    question: "Question 3: Where are you from?",
    options: ["Europe", "North America", "Asia", "Other"],
  },
  {
    question: "Question 4: What is your favorite food?",
    options: ["Pizza", "Burger", "Sushi", "Pasta"],
  },
  {
    question: "Question 5: Do you have any hobbies?",
    options: ["Yes", "No"],
  },
];

const clientOptions = {
  puppeteer: {
    headless: false,
  },
};

const client = new Client(clientOptions);

let qrCodePath;
let currentQuestionIndex = 0; // Variable to track the current question index
const closedUsers = []; // Array to store closed users

client.on("qr", async (qrCodeData) => {
  console.log("QR Code:", qrCodeData);
  qrCodePath = `${__dirname}/qrcode.png`;

  await qrcode.toFile(qrCodePath, qrCodeData);
});

client.on("ready", () => {
  console.log("WhatsApp bot is ready!");
});

client.on("message", async (message) => {
  console.log("Received message:", message.body);

  if (message.body.toLowerCase() === "hi") {
    await askQuestion(message.from);
  } else {
    await processAnswer(message.from, message.body);
  }
});

async function askQuestion(recipient) {
  if (closedUsers.includes(recipient)) {
    return;
  }

  if (currentQuestionIndex >= questions.length) {
    await allQuestionsAnswered(recipient);
    return;
  }

  const currentQuestion = questions[currentQuestionIndex];

  const optionsText = currentQuestion.options
    .map((option, index) => `${index + 1}. ${option}`)
    .join("\n");
  const questionText = `${currentQuestion.question}\n\n${optionsText}\n\nReply with the option number.`;

  await client.sendMessage(recipient, questionText);
}

async function processAnswer(recipient, selectedOption) {
  if (closedUsers.includes(recipient)) {
    return;
  }

  const question = questions[currentQuestionIndex];

  const optionIndex = parseInt(selectedOption) - 1;

  if (
    isNaN(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= question.options.length
  ) {
    await client.sendMessage(recipient, "Invalid option selected.");
    return;
  }

  currentQuestionIndex++;

  if (currentQuestionIndex >= questions.length) {
    await allQuestionsAnswered(recipient);
    return;
  }

  askQuestion(recipient);
}

async function allQuestionsAnswered(recipient) {
  await client.sendMessage(
    recipient,
    "Thank you for answering all the questions!"
  );

  // Send a message to 8971640963
  //   await client.sendMessage(
  //     "8971640963",
  //     `User ${recipient} has answered all the questions.`
  //   );

  closedUsers.push(recipient); // Add the recipient to the closedUsers array
}

const app = express();
const port = 3000;

// Serve the QR code image on the root URL
app.get("/", (req, res) => {
  if (qrCodePath) {
    res.writeHead(200, { "Content-Type": "image/png" });
    createReadStream(qrCodePath).pipe(res);
  } else {
    res.send("QR code is not available yet. Please try again later.");
  }
});

client.initialize();

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
