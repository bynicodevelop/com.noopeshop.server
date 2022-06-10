module.exports = {
  "root": true,
  "env": {
    es6: true,
    node: true,
  },
  "parserOptions": {
    "ecmaVersion": 8,
    "ecmaFeatures": {
      "experimentalObjectRestSpread": true,
    },
    "sourceType": "module",
  },
  "extends": [
    "eslint:recommended",
  ],
  "rules": {
    "quotes": ["error", "double"],
    "arrow-body-style": ["error", "always"],
  },
};
