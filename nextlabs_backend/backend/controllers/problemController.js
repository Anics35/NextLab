const Problem = require("../models/Problem");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId, toStringValue } = require("../utils/validators");

async function listProblems(req, res, next) {
  try {
    const filter = {};
    if (req.user?.role === "teacher") {
      filter.createdBy = req.user.id;
    } else if (req.query.teacherId && isValidObjectId(req.query.teacherId)) {
      filter.createdBy = req.query.teacherId;
    }

    const problems = await Problem.find(filter)
      .select("title description difficulty publicTestCases hiddenTestCases testCases createdAt createdBy")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error) {
    next(error);
  }
}

async function getProblem(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw createApiError(400, "Problem id must be a valid MongoDB ObjectId", "INVALID_PROBLEM_ID");
    }

    const problem = await Problem.findById(id);
    if (!problem) {
      throw createApiError(404, "Problem not found", "PROBLEM_NOT_FOUND");
    }
    console.log("TEST CASES:", problem.testCases);

    res.json({
      success: true,
      problem
    });
  } catch (error) {
    next(error);
  }
}

async function createProblem(req, res, next) {
  try {
    const {
      title,
      description,
      difficulty = "easy",
      publicTestCases = [],
      hiddenTestCases = []
    } = req.body;
    console.log("[createProblem] req.body", req.body);

    if (isBlank(title) || isBlank(description)) {
      throw createApiError(400, "title and description are required", "MISSING_FIELDS");
    }

    const validateCase = (testCase) => (
      typeof testCase !== "object" ||
      testCase === null ||
      isBlank(toStringValue(testCase.output, ""))
    );

    const invalidPublic = publicTestCases.findIndex(validateCase);
    if (invalidPublic !== -1) {
      throw createApiError(
        400,
        `publicTestCases[${invalidPublic}] must include output`,
        "INVALID_TEST_CASE"
      );
    }
    const invalidHidden = hiddenTestCases.findIndex(validateCase);
    if (invalidHidden !== -1) {
      throw createApiError(400, `hiddenTestCases[${invalidHidden}] must include output`, "INVALID_TEST_CASE");
    }

    const problem = await Problem.create({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      createdBy: req.user.id,
      publicTestCases: publicTestCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        output: toStringValue(testCase.output).trim()
      })),
      hiddenTestCases: hiddenTestCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        output: toStringValue(testCase.output).trim()
      })),
      testCases: [
        ...publicTestCases.map((testCase) => ({
          input: toStringValue(testCase.input),
          expectedOutput: toStringValue(testCase.output).trim(),
          isPublic: true
        })),
        ...hiddenTestCases.map((testCase) => ({
          input: toStringValue(testCase.input),
          expectedOutput: toStringValue(testCase.output).trim(),
          isPublic: false
        }))
      ]
    });
    console.log("TEST CASES:", problem.testCases);

    res.status(201).json({
      success: true,
      problem
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createProblem, getProblem, listProblems };
