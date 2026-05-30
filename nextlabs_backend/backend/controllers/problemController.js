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
      .select("title description difficulty problemType publicTestCases hiddenTestCases testCases createdAt createdBy")
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
      problemType = "testcase",
      publicTestCases = [],
      hiddenTestCases = [],
      testCases = []
    } = req.body;
    console.log("[createProblem] req.body", req.body);

    if (isBlank(title) || isBlank(description)) {
      throw createApiError(400, "title and description are required", "MISSING_FIELDS");
    }

    if (!["testcase", "design"].includes(problemType)) {
      throw createApiError(400, "problemType must be 'testcase' or 'design'", "INVALID_PROBLEM_TYPE");
    }

    const legacyPublicCases = Array.isArray(testCases)
      ? testCases.filter((testCase) => testCase.isPublic)
      : [];
    const legacyHiddenCases = Array.isArray(testCases)
      ? testCases.filter((testCase) => !testCase.isPublic)
      : [];
    const effectivePublicCases = Array.isArray(publicTestCases) && publicTestCases.length > 0
      ? publicTestCases
      : legacyPublicCases;
    const effectiveHiddenCases = Array.isArray(hiddenTestCases) && hiddenTestCases.length > 0
      ? hiddenTestCases
      : legacyHiddenCases;

    // Test cases are required only for testcase type problems
    if (problemType === "testcase" && effectivePublicCases.length + effectiveHiddenCases.length === 0) {
      throw createApiError(400, "At least one test case is required for testcase problems", "MISSING_FIELDS");
    }

    const getExpectedOutput = (testCase) => toStringValue(testCase.output || testCase.expectedOutput, "");
    const validateCase = (testCase) => (
      typeof testCase !== "object" ||
      testCase === null ||
      isBlank(getExpectedOutput(testCase))
    );

    const invalidPublic = effectivePublicCases.findIndex(validateCase);
    if (invalidPublic !== -1) {
      throw createApiError(
        400,
        `publicTestCases[${invalidPublic}] must include output`,
        "INVALID_TEST_CASE"
      );
    }
    const invalidHidden = effectiveHiddenCases.findIndex(validateCase);
    if (invalidHidden !== -1) {
      throw createApiError(400, `hiddenTestCases[${invalidHidden}] must include output`, "INVALID_TEST_CASE");
    }

    const problem = await Problem.create({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      problemType,
      createdBy: req.user.id,
      publicTestCases: effectivePublicCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        output: getExpectedOutput(testCase).trim()
      })),
      hiddenTestCases: effectiveHiddenCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        output: getExpectedOutput(testCase).trim()
      })),
      testCases: [
        ...effectivePublicCases.map((testCase) => ({
          input: toStringValue(testCase.input),
          expectedOutput: getExpectedOutput(testCase).trim(),
          isPublic: true
        })),
        ...effectiveHiddenCases.map((testCase) => ({
          input: toStringValue(testCase.input),
          expectedOutput: getExpectedOutput(testCase).trim(),
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

async function updateProblem(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw createApiError(400, "Problem id must be a valid MongoDB ObjectId", "INVALID_PROBLEM_ID");
    }

    const existingProblem = await Problem.findById(id);
    if (!existingProblem) {
      throw createApiError(404, "Problem not found", "PROBLEM_NOT_FOUND");
    }

    if (String(existingProblem.createdBy) !== String(req.user.id)) {
      throw createApiError(403, "You can only update your own problems", "FORBIDDEN");
    }

    const {
      title,
      description,
      difficulty = existingProblem.difficulty,
      problemType = existingProblem.problemType || "testcase",
      publicTestCases = existingProblem.publicTestCases,
      hiddenTestCases = existingProblem.hiddenTestCases,
      testCases = []
    } = req.body;

    if (isBlank(title) || isBlank(description)) {
      throw createApiError(400, "title and description are required", "MISSING_FIELDS");
    }

    if (!["testcase", "design"].includes(problemType)) {
      throw createApiError(400, "problemType must be 'testcase' or 'design'", "INVALID_PROBLEM_TYPE");
    }

    const legacyPublicCases = Array.isArray(testCases)
      ? testCases.filter((testCase) => testCase.isPublic)
      : [];
    const legacyHiddenCases = Array.isArray(testCases)
      ? testCases.filter((testCase) => !testCase.isPublic)
      : [];
    const effectivePublicCases = Array.isArray(publicTestCases) && publicTestCases.length > 0
      ? publicTestCases
      : legacyPublicCases;
    const effectiveHiddenCases = Array.isArray(hiddenTestCases) && hiddenTestCases.length > 0
      ? hiddenTestCases
      : legacyHiddenCases;

    // Test cases are required only for testcase type problems
    if (problemType === "testcase" && effectivePublicCases.length + effectiveHiddenCases.length === 0) {
      throw createApiError(400, "At least one test case is required for testcase problems", "MISSING_FIELDS");
    }

    const getExpectedOutput = (testCase) => toStringValue(testCase.output || testCase.expectedOutput, "");
    const validateCase = (testCase) => (
      typeof testCase !== "object" ||
      testCase === null ||
      isBlank(getExpectedOutput(testCase))
    );

    const invalidPublic = effectivePublicCases.findIndex(validateCase);
    if (invalidPublic !== -1) {
      throw createApiError(
        400,
        `publicTestCases[${invalidPublic}] must include output`,
        "INVALID_TEST_CASE"
      );
    }

    const invalidHidden = effectiveHiddenCases.findIndex(validateCase);
    if (invalidHidden !== -1) {
      throw createApiError(400, `hiddenTestCases[${invalidHidden}] must include output`, "INVALID_TEST_CASE");
    }

    existingProblem.title = title.trim();
    existingProblem.description = description.trim();
    existingProblem.difficulty = difficulty;
    existingProblem.problemType = problemType;
    existingProblem.publicTestCases = effectivePublicCases.map((testCase) => ({
      input: toStringValue(testCase.input),
      output: getExpectedOutput(testCase).trim()
    }));
    existingProblem.hiddenTestCases = effectiveHiddenCases.map((testCase) => ({
      input: toStringValue(testCase.input),
      output: getExpectedOutput(testCase).trim()
    }));
    existingProblem.testCases = [
      ...effectivePublicCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        expectedOutput: getExpectedOutput(testCase).trim(),
        isPublic: true
      })),
      ...effectiveHiddenCases.map((testCase) => ({
        input: toStringValue(testCase.input),
        expectedOutput: getExpectedOutput(testCase).trim(),
        isPublic: false
      }))
    ];

    const problem = await existingProblem.save();

    res.json({
      success: true,
      problem
    });
  } catch (error) {
    next(error);
  }
}

async function deleteProblem(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw createApiError(400, "Problem id must be a valid MongoDB ObjectId", "INVALID_PROBLEM_ID");
    }

    const existingProblem = await Problem.findById(id);
    if (!existingProblem) {
      throw createApiError(404, "Problem not found", "PROBLEM_NOT_FOUND");
    }

    if (String(existingProblem.createdBy) !== String(req.user.id)) {
      throw createApiError(403, "You can only delete your own problems", "FORBIDDEN");
    }

    await existingProblem.deleteOne();

    res.json({
      success: true,
      message: "Problem deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createProblem, getProblem, listProblems, updateProblem, deleteProblem };
