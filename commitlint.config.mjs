import conventional from "@commitlint/config-conventional";

/**
 * Conventional Commits, extended with the project's non-standard `security`
 * type (all authorization lives in Postgres, so security changes get a
 * first-class type). Everything else inherits the conventional defaults.
 */
const Configuration = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", [...conventional.rules["type-enum"][2], "security"]],
  },
};

export default Configuration;
