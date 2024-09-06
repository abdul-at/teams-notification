import {expect, jest, it, describe, beforeEach,afterEach} from '@jest/globals'

import { run } from "../index";
import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { readFileSync, writeFileSync } from "fs"

jest.mock("@actions/core", () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("@actions/github", () => ({
  context: {
    repo: { owner: "owner", repo: "repo" },
  },
  getOctokit: jest.fn(),
}));

describe("run", () => {
  let mockOctokit:any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: { get: jest.fn() },
        actions: {
          listRepoVariables: jest.fn(),
          listEnvironmentVariables: jest.fn(),
          listOrgVariables: jest.fn(),
        },
      },
    };
    jest.clearAllMocks();
    (getOctokit as jest.Mock).mockReturnValue(mockOctokit);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test successful token replacement for environment variables
  it("replaces tokens with environment variables", async () => {
    const mockPayload = {};
    const token = "my-token";
    const envName = "";
    const orgName = "";
    const filesPath = "path/to/files";
    const fileName = "file.txt";
    const tokenPrefix = "#{";
    const tokenSuffix = "}";
    const envVar1 = "VAR1";
    const envVar2 = "VAR2";
    const envVarValue1 = "value1";
    const envVarValue2 = "value2";
    const fileContent = `This is a test with <span class="math-inline">\{tokenPrefix\}</span>{envVar1}${tokenSuffix} and <span class="math-inline">\{tokenPrefix\}</span>{envVar2}${tokenSuffix}`;

    process.env[envVar1] = envVarValue1;
    process.env[envVar2] = envVarValue2;

    (getInput as jest.Mock).mockReturnValueOnce(token)
      .mockReturnValueOnce(envName)
      .mockReturnValueOnce(orgName)
      .mockReturnValueOnce(filesPath)
      .mockReturnValueOnce(fileName)
      .mockReturnValueOnce(tokenPrefix)
      .mockReturnValueOnce(tokenSuffix);

    mockOctokit.rest.repos.get.mockReturnValue({ data: { id: 123 } });
    (readFileSync as jest.Mock).mockReturnValueOnce(fileContent);

    await run();

    expect(getInput).toHaveBeenCalledTimes(7); // Includes all inputs

    expect(readFileSync).toHaveBeenCalledWith(`<span class="math-inline">\{filesPath\}/</span>{fileName}`, 'utf-8');
    expect(writeFileSync).toHaveBeenCalledWith(`<span class="math-inline">\{filesPath\}/</span>{fileName}`, expect.stringMatching(new RegExp(`<span class="math-inline">\{envVarValue1\}\|</span>{envVarValue2}`, 'g'))); // Ensure both variables replaced

    expect(setFailed).not.toHaveBeenCalled();
  });

  // Test successful token replacement for additional variables
  it("replaces tokens with additional variables", async () => {
    const mockPayload = {};
    const token = "my-token";
    const envName = "";
    const orgName = "";
    const filesPath = "path/to/files";
    const fileName = "file.txt";
    const tokenPrefix = "#{";
    const tokenSuffix = "}";
    const addVar1 = "ADD_VAR1";
    const addVar2 = "ADD_VAR2";
    const addVarValue1 = "add_value1";
    const addVarValue2 = "add_value2";
    const fileContent = `This is a test with <span class="math-inline">\{tokenPrefix\}</span>{addVar1}${tokenSuffix} and <span class="math-inline">\{tokenPrefix\}</span>{addVar2}${tokenSuffix}`;

    (getInput as jest.Mock).mockReturnValueOnce(token)
      .mockReturnValueOnce(envName)
      .mockReturnValueOnce(orgName)
      .mockReturnValueOnce(filesPath)
      .mockReturnValueOnce(fileName)
      .mockReturnValueOnce(tokenPrefix)
      .mockReturnValueOnce(tokenSuffix);

  });
});