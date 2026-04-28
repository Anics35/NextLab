const Problem = require("../models/Problem");
const { createApiError } = require("../utils/apiError");
const { isBlank, isValidObjectId, toStringValue } = require("../utils/validators");

async function listProblems(req, res, next) {
  try {
    // FIXED: Added "testCases" to the select string so the frontend can see samples
    const problems = await Problem.find()
      .select("title description difficulty testCases createdAt") 
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
    const { title, description, difficulty = "easy", testCases = [] } = req.body;

    if (isBlank(title) || isBlank(description) || !Array.isArray(testCases) || testCases.length === 0) {
      throw createApiError(400, "title, description and at least one test case are required", "MISSING_FIELDS");
    }

    const invalidCaseIndex = testCases.findIndex((testCase) => isBlank(testCase.expectedOutput));
    if (invalidCaseIndex !== -1) {
      throw createApiError(400, `testCases[${invalidCaseIndex}].expectedOutput is required`, "INVALID_TEST_CASE");
    }

    // FIXED: Mapping logic now includes isPublic
    const problem = await Problem.create({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      testCases: testCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        expectedOutput: toStringValue(testCase.expectedOutput).trim(),
        isPublic: !!testCase.isPublic // Force convert to boolean true/false
      }))
    });

    res.status(201).json({
      success: true,
      problem
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createProblem, getProblem, listProblems };