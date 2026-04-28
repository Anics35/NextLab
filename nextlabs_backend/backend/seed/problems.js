require("dotenv").config();

const { connectDatabase } = require("../config/db");
const Problem = require("../models/Problem");

const problems = [
  {
    title: "Sum Two Numbers",
    description: "Read two integers from input and print their sum.",
    difficulty: "easy",
    testCases: [
      { input: "2 3", expectedOutput: "5" },
      { input: "10 15", expectedOutput: "25" }
    ]
  },
  {
    title: "Reverse String",
    description: "Read a string and print it in reverse order.",
    difficulty: "easy",
    testCases: [
      { input: "nexlab", expectedOutput: "balxen" },
      { input: "code", expectedOutput: "edoc" }
    ]
  }
];

async function seed() {
  await connectDatabase();
  await Problem.deleteMany({});
  await Problem.insertMany(problems);
  console.log("Seeded problems");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
